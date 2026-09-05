import type { Project, User } from "@prisma/client";
import { ConfigError, AiProviderError, ValidationError } from "@/lib/errors";
import { logger } from "../logger";
import { requireDb } from "../db";
import { getAgentLLM } from "../ai/config";
import { structured } from "../ai/structured";
import { assertPlanAllowed, recordUsage } from "../usage";
import { logAudit } from "../audit";
import type { AppFileOp, PipelineStep, PipelineResult, RunKind } from "@/types/app";
import {
  blueprintSchema, appPlanSchema, appFixSchema, appFilesSchema, validateOps,
} from "./blueprint";
import {
  appSystem, buildBlueprintPrompt, buildAppFilesPrompt, buildAgentPlanPrompt, buildFixPrompt, clampPrompt, compactHistory, fileIndex,
} from "./prompts";
import { ensureAppWorkspace, readAppFiles, applyFileOps, createAppRun, updateAppRun, listAppRuns, createCheckpoint } from "./data";
import { runPipeline } from "./runner";
import { gitCommit } from "./workspace";
import { hasRealFiles, workspaceDir } from "./templates";
import { assertNotCancelled, clearCancel, isCancelled } from "./cancel";
import { runDeployment } from "../deploy/run";

export type AppEvent =
  | { type: "stage"; label: string }
  | { type: "plan"; steps: string[] }
  | { type: "op"; label: string }
  | { type: "step"; step: PipelineStep }
  | { type: "run"; status: "PASSED" | "FAILED" | "CANCELLED"; summary?: string; steps: PipelineStep[] }
  | { type: "checkpoint"; version: number; message: string }
  | { type: "reply"; text: string }
  | { type: "error"; message: string; code: string }
  | { type: "done" };

export interface AgentInput {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  emit: (e: AppEvent) => void;
  /** runId of the AppRun row driving the run (for cancellation) */
  runId: string;
  history?: { role: string; content: string }[];
}

const MAX_FIX_ATTEMPTS = 3;

async function meter(input: AgentInput, kind: "AI_GENERATION" | "IMAGE_GENERATION" = "AI_GENERATION") {
  await assertPlanAllowed(kind, { user: input.actor, projectId: input.project.id });
  await recordUsage({ userId: input.actor.id, kind });
}

async function runPipelineWithSteps(
  input: AgentInput,
  opts: { onStep: (step: PipelineStep) => void; signalCheck: () => void }
): Promise<PipelineResult> {
  const result = await runPipeline({
    projectId: input.project.id,
    onStep: (step) => {
      opts.signalCheck();
      opts.onStep(step);
    },
  });
  return result;
}

/** Materialize files, run QA, then iterate the AI fix loop until green or limit. */
async function verifyAndFix(input: AgentInput, kind: RunKind): Promise<{ result: PipelineResult; fixIterations: number }> {
  const db = requireDb();
  const startedAt = Date.now();

  const finishRun = async (status: "PASSED" | "FAILED" | "CANCELLED", result: PipelineResult, summary?: string) => {
    await updateAppRun(input.runId, {
      status,
      steps: result.steps,
      summary: summary ?? (status === "PASSED" ? "All checks passed" : "Checks failed"),
      durationMs: Date.now() - startedAt,
      finishedAt: new Date(),
    });
  };

  let result: PipelineResult;
  let fixIterations = 0;

  try {
    result = await runPipelineWithSteps(input, {
      onStep: (step) => input.emit({ type: "step", step }),
      signalCheck: () => assertNotCancelled(input.runId),
    });
  } catch (e) {
    if (isCancelled(input.runId)) {
      await finishRun("CANCELLED", { steps: [], passed: false, durationMs: 0 });
      clearCancel(input.runId);
      input.emit({ type: "run", status: "CANCELLED", steps: [] });
      throw e;
    }
    throw e;
  }

  // AI fix loop — real: analyze failing output, patch files, re-run.
  while (!result.passed && fixIterations < MAX_FIX_ATTEMPTS && !isCancelled(input.runId)) {
    fixIterations++;
    assertNotCancelled(input.runId);
    input.emit({ type: "stage", label: `Fixing failures (attempt ${fixIterations}/${MAX_FIX_ATTEMPTS})...` });
    const files = await readAppFiles(input.project.id);
    const failing = result.steps.filter((s) => s.status === "fail" || s.status === "warn");
    let fix;
    try {
      const res = await structured(() => getAgentLLM(input.project), {
        label: "ai fix",
        schema: appFixSchema,
        request: {
          system: appSystem(),
          user: buildFixPrompt({ files, failingSteps: failing, attempt: fixIterations, maxAttempts: MAX_FIX_ATTEMPTS }),
          maxTokens: 8192,
        },
      });
      fix = res;
      await recordUsage({ userId: input.actor.id, kind: "AI_TOKENS", amount: res.tokensIn + res.tokensOut }).catch(() => {});
    } catch (e) {
      logger.warn("app.fix.llm_failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
      break;
    }

    if (!fix.data.operations.length || fix.data.continue === false) break;
    const ops = validateOps(fix.data.operations);
    try {
      const labels = await applyFileOps(input.project.id, ops, input.actor.id);
      for (const l of labels) input.emit({ type: "op", label: l });
    } catch (e) {
      logger.warn("app.fix.apply_failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
      break;
    }
    assertNotCancelled(input.runId);
    result = await runPipelineWithSteps(input, {
      onStep: (step) => input.emit({ type: "step", step }),
      signalCheck: () => assertNotCancelled(input.runId),
    });
  }

  await finishRun(result.passed ? "PASSED" : "FAILED", result);
  void db;
  return { result, fixIterations };
}

// ── Full application generation ─────────────────────────────────────────────

export async function runGenerateApp(input: AgentInput & { prompt: string }): Promise<void> {
  const db = requireDb();
  await ensureAppWorkspace(input.project.id);
  await meter(input);
  const prompt = clampPrompt(input.prompt);

  const generation = await db.generation.create({
    data: { projectId: input.project.id, userId: input.actor.id, kind: "CODE", status: "RUNNING", prompt: `[app] ${prompt.slice(0, 300)}` },
  });
  let tokensIn = 0;
  let tokensOut = 0;

  const fail = async (message: string) => {
    await db.generation.update({ where: { id: generation.id }, data: { status: "FAILED", error: message.slice(0, 400), finishedAt: new Date() } });
    input.emit({ type: "error", message, code: "APP_GENERATION_FAILED" });
  };

  try {
    // 1. Blueprint
    input.emit({ type: "stage", label: "Analyzing requirements..." });
    const bp = await structured(() => getAgentLLM(input.project), {
      label: "app blueprint",
      schema: blueprintSchema,
      request: { system: appSystem(), user: buildBlueprintPrompt(prompt), maxTokens: 4096 },
    });
    tokensIn += bp.tokensIn;
    tokensOut += bp.tokensOut;
    input.emit({ type: "stage", label: `Planning ${bp.data.name}...` });
    input.emit({
      type: "plan",
      steps: [
        `Design app: ${bp.data.modules.join(", ") || "core app"}`,
        `Model data: ${bp.data.dataModels.map((m) => m.name).join(", ") || "none"}`,
        `Define API: ${bp.data.apiRoutes.length} route(s)`,
        `Require env: ${bp.data.envRequirements.map((e) => e.name).join(", ") || "none"}`,
        "Write source files",
        "Write tests",
        "Run automated QA",
        "Auto-deploy to production",
      ],
    });

    // 2. Files
    input.emit({ type: "stage", label: "Writing application files..." });
    const filesRes = await structured(() => getAgentLLM(input.project), {
      label: "app files",
      schema: appFilesSchema,
      request: { system: appSystem(), user: buildAppFilesPrompt(bp.data, prompt), maxTokens: 16000 },
    });
    tokensIn += filesRes.tokensIn;
    tokensOut += filesRes.tokensOut;

    const ops: AppFileOp[] = filesRes.data.files.map((f) => ({ kind: "edit", path: f.path, content: f.content }));
    const validated = validateOps(ops);
    const labels = await applyFileOps(input.project.id, validated, input.actor.id);
    for (const l of labels) input.emit({ type: "op", label: l });

    // 3. Automated QA + fix loop
    input.emit({ type: "stage", label: "Running automated tests..." });
    const { result } = await verifyAndFix(input, "generate");

    // 4. Checkpoint + git commit (traceability)
    input.emit({ type: "stage", label: "Saving checkpoint..." });
    const commitHash = await gitCommit(workspaceDir(input.project.id), `AI generate: ${bp.data.name} — ${filesRes.data.summary.slice(0, 80)}`);
    const cp = await createCheckpoint(input.project.id, `Generated "${bp.data.name}" — ${filesRes.data.summary}`, input.actor.id, commitHash ?? undefined);
    input.emit({ type: "checkpoint", version: cp.version, message: `Generated "${bp.data.name}"` });

    const passed = result.passed;
    let deployUrl: string | null = null;

    // 5. Auto-deploy if generation passed
    if (passed) {
      try {
        input.emit({ type: "stage", label: "Deploying your app to production..." });
        const project = await db.project.findUnique({ where: { id: input.project.id } });
        if (project) {
          const deployResult = await runDeployment({
            project,
            actor: input.actor,
            message: `Auto-deploy: ${bp.data.name}`,
          });
          deployUrl = deployResult.url;
          if (deployUrl) {
            input.emit({ type: "reply", text: `🚀 Your app is LIVE at ${deployUrl}` });
          }
        }
      } catch (e) {
        logger.warn("app.generate.auto_deploy_failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
        input.emit({ type: "reply", text: "⚠️ App generated but auto-deploy failed. You can deploy manually from the Deploy button." });
      }
    }

    const summary = `${passed ? "✅" : "⚠️"} Generated "${bp.data.name}" — ${Object.keys(filesRes.data.files).length} files, ${result.steps.filter((s) => s.status === "pass").length}/${result.steps.length} checks passed${deployUrl ? ` · 🚀 Live at ${deployUrl}` : ""}`;

    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: passed ? "COMPLETED" : "FAILED",
        finishedAt: new Date(),
        tokensIn, tokensOut,
        result: { app: true, name: bp.data.name, modules: bp.data.modules, files: filesRes.data.files.length, passed, securityScore: securityScoreFrom(result), deployUrl },
      },
    });
    await logAudit({ actorId: input.actor.id, projectId: input.project.id, action: "app.generate", entity: "AppRun", entityId: input.runId, meta: { name: bp.data.name, passed, tokensIn, tokensOut, deployUrl } });
    input.emit({ type: "reply", text: summary });
  } catch (e) {
    logger.error("app.generate.failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
    if (isCancelled(input.runId)) {
      clearCancel(input.runId);
      return;
    }
    const msg = e instanceof ConfigError || e instanceof AiProviderError || e instanceof ValidationError ? e.publicMessage : "App generation failed. Please try again.";
    await fail(msg);
    throw e;
  } finally {
    input.emit({ type: "done" });
  }
}

// ── Agentic coding (chat-driven modifications) ──────────────────────────────

export async function runCodingAgent(input: AgentInput & { message: string }): Promise<void> {
  const db = requireDb();
  const message = clampPrompt(input.message);

  // First real use → treat the message as an app-generation prompt.
  const files = await readAppFiles(input.project.id);
  if (!hasRealFiles(files)) {
    await runGenerateApp({ ...input, prompt: message });
    return;
  }

  await meter(input);
  const startedAt = Date.now();
  try {
    const runs = await listAppRuns(input.project.id, 3);
    const lastRunCtx = runs[0]
      ? `last run: ${runs[0].status}${runs[0].summary ? ` — ${runs[0].summary}` : ""}`
      : "no QA run yet";
    const historyCtx = compactHistory(input.history ?? []);

    // 1. Analyze + plan
    input.emit({ type: "stage", label: "Analyzing request..." });
    const plan = await structured(() => getAgentLLM(input.project), {
      label: "agent plan",
      schema: appPlanSchema,
      request: { system: appSystem(), user: buildAgentPlanPrompt({ files, lastRun: lastRunCtx, message, history: historyCtx }), maxTokens: 8192 },
    });
    await recordUsage({ userId: input.actor.id, kind: "AI_TOKENS", amount: plan.tokensIn + plan.tokensOut }).catch(() => {});
    input.emit({ type: "plan", steps: plan.data.steps });
    input.emit({ type: "stage", label: "Planning changes..." });

    const ops = validateOps(plan.data.operations);
    if (!ops.length) {
      input.emit({ type: "reply", text: plan.data.summary || "Nothing to change — the workspace already matches your request." });
      return;
    }

    // 2. Apply
    input.emit({ type: "stage", label: "Applying changes..." });
    const labels = await applyFileOps(input.project.id, ops, input.actor.id);
    for (const l of labels) input.emit({ type: "op", label: l });

    // 3. Verify (+ fix loop)
    if (plan.data.runTests) {
      input.emit({ type: "stage", label: "Running automated tests..." });
      const { result } = await verifyAndFix(input, "agent");
      const passed = result.passed;
      const count = result.steps.filter((s) => s.status === "pass").length;
      input.emit({
        type: "reply",
        text: `${passed ? "✅ Done" : "⚠️ Changes applied but checks still failing"} — ${labels.length} change(s), ${count}/${result.steps.length} checks passed.${plan.data.summary ? ` ${plan.data.summary}` : ""}`,
      });
    } else {
      input.emit({ type: "reply", text: `${plan.data.summary || "Done."} (tests skipped for this change)` });
    }

    // 4. Checkpoint + git commit
    input.emit({ type: "stage", label: "Saving checkpoint..." });
    const commitHash = await gitCommit(workspaceDir(input.project.id), `AI edit: ${message.slice(0, 80)}`);
    const cp = await createCheckpoint(input.project.id, `AI edit: ${message.slice(0, 140)}`, input.actor.id, commitHash ?? undefined);
    input.emit({ type: "checkpoint", version: cp.version, message: `AI edit: ${message.slice(0, 80)}` });

    const durationMs = Date.now() - startedAt;
    await updateAppRun(input.runId, { summary: undefined, durationMs, finishedAt: new Date() }).catch(() => {});
    await logAudit({ actorId: input.actor.id, projectId: input.project.id, action: "app.agent", entity: "AppRun", entityId: input.runId, meta: { ops: labels.length, message: message.slice(0, 200) } });
  } catch (e) {
    logger.error("app.agent.failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
    if (isCancelled(input.runId)) {
      clearCancel(input.runId);
      return;
    }
    const msg = e instanceof ConfigError || e instanceof AiProviderError || e instanceof ValidationError ? e.publicMessage : "The coding agent failed. Please try again.";
    input.emit({ type: "error", message: msg, code: "APP_AGENT_FAILED" });
    throw e;
  } finally {
    input.emit({ type: "done" });
  }
}

function securityScoreFrom(result: PipelineResult): number {
  const sec = result.steps.find((s) => s.id === "security");
  const m = sec?.output?.match(/(\d{1,3})\/100/);
  return m ? Number(m[1]) : 0;
}

/** Manual "Test & Fix Everything" run — full QA pipeline + AI fix loop. */
export async function runFullQa(input: AgentInput): Promise<void> {
  const startedAt = Date.now();
  try {
    await ensureAppWorkspace(input.project.id);
    input.emit({ type: "stage", label: "Verifying workspace..." });
    const { result } = await verifyAndFix(input, "full");
    const passed = result.passed;
    const count = result.steps.filter((s) => s.status === "pass").length;
    const warnCount = result.steps.filter((s) => s.status === "warn").length;
    const commitHash = await gitCommit(workspaceDir(input.project.id), "QA run (Test & Fix Everything)");
    const cp = await createCheckpoint(input.project.id, `QA run — ${passed ? "all checks passed" : "checks completed with failures"}`, input.actor.id, commitHash ?? undefined);
    input.emit({ type: "checkpoint", version: cp.version, message: `QA run — ${count}/${result.steps.length} checks passed` });
    input.emit({
      type: "reply",
      text: `${passed ? "✅ All checks passed" : "⚠️ QA completed — see failing steps"} — ${count}/${result.steps.length} passed, ${warnCount} warning(s), in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`,
    });
  } finally {
    input.emit({ type: "done" });
  }
}
