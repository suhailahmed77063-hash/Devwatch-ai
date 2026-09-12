/**
 * Security Agent — orchestrator.
 *
 * Wires the modules together and persists everything: runs, findings,
 * actions (audit trail), validations, patches, verifications. This is the
 * single entry point the API routes call.
 */

import type { Prisma, Role } from "@prisma/client";
import { requireDb } from "../db";
import { logger } from "../logger";
import { assertToolAllowed, type SecurityTool } from "./permissions";
import { loadSecuritySource, redactFileMap } from "./source";
import { runAllScanners } from "./scanners";
import { investigateFinding, applyInvestigation, type Investigation } from "./investigator";
import { validateFinding } from "./validator";
import { generateRemediation } from "./remediation";
import { verifyFix } from "./verifier";
import { fingerprintOf, redactSecrets } from "./utils";
import type { RawFinding, SecurityAgentEvent } from "./types";

type Emit = (e: SecurityAgentEvent) => void;

// ── Audit trail (SecurityAction rows) ───────────────────────────────────────

export interface AgentActionInput {
  projectId: string;
  runId?: string | null;
  findingId?: string | null;
  actorId?: string | null;
  tool: SecurityTool;
  action: string;
  status?: "OK" | "DENIED" | "ERROR";
  authScope?: "NONE" | "USER" | "EXPLICIT" | "SYSTEM";
  authorized?: boolean;
  environment?: string | null;
  input?: unknown;
  result?: unknown;
  error?: string | null;
  durationMs?: number;
}

/** Record one agent tool invocation. Never throws. */
export async function recordSecurityAction(input: AgentActionInput): Promise<void> {
  const db = requireDb();
  try {
    await db.securityAction.create({
      data: {
        projectId: input.projectId,
        runId: input.runId ?? null,
        findingId: input.findingId ?? null,
        actorId: input.actorId ?? null,
        tool: input.tool,
        action: input.action,
        status: input.status ?? "OK",
        authScope: input.authScope ?? "USER",
        authorized: input.authorized ?? false,
        environment: input.environment ?? null,
        input: safeJson(input.input),
        result: safeJson(input.result),
        error: input.error ?? null,
        durationMs: input.durationMs ?? null,
      },
    });
  } catch (e) {
    logger.warn("security.action.write_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

function safeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(redactSecrets(JSON.stringify(value, null, 0).slice(0, 8_000))) as Prisma.InputJsonValue;
  } catch {
    return { note: "unserializable" };
  }
}

// ── Run lifecycle helpers ───────────────────────────────────────────────────

async function createRun(input: {
  projectId: string;
  kind: RunKindLite;
  createdById: string;
}): Promise<string> {
  const db = requireDb();
  const run = await db.securityRun.create({
    data: { projectId: input.projectId, kind: input.kind, createdById: input.createdById, status: "QUEUED" },
  });
  return run.id;
}

type RunKindLite = "SCAN" | "INVESTIGATE" | "VALIDATE" | "REMEDIATE" | "VERIFY" | "FULL";

async function finishRun(runId: string, patch: {
  status?: "COMPLETED" | "FAILED";
  summary?: string;
  error?: string | null;
  fileCount?: number;
  findingCount?: number;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
}): Promise<void> {
  const db = requireDb();
  await db.securityRun.update({ where: { id: runId }, data: { ...patch, finishedAt: new Date() } });
}

// ── Scan + investigate ──────────────────────────────────────────────────────

export interface InvestigateOptions {
  projectId: string;
  actor: { id: string; role: Role; plan?: string };
  repoLink?: string | null;
  emit: Emit;
  /** Investigate at most this many findings with the AI (cost control). */
  maxInvestigations?: number;
}

/** Full detect → investigate pass. Returns the run id. */
export async function runScanAndInvestigate(opts: InvestigateOptions): Promise<string> {
  const db = requireDb();
  const started = Date.now();
  const runId = await createRun({ projectId: opts.projectId, kind: "FULL", createdById: opts.actor.id });
  opts.emit({ type: "run", runId });

  try {
    await db.securityRun.update({ where: { id: runId }, data: { status: "RUNNING" } });

    // 1. Authorization + source resolution
    assertToolAllowed({ tool: "READ_REPOSITORY", role: opts.actor.role });
    await recordSecurityAction({
      projectId: opts.projectId, runId, actorId: opts.actor.id,
      tool: "READ_REPOSITORY", action: "resolve scan source", authScope: "USER", authorized: true,
    });

    const project = await db.project.findUnique({ where: { id: opts.projectId }, select: { aiConfig: true } });
    const cfgToken = (project?.aiConfig as { githubToken?: string } | null)?.githubToken;
    const ghToken = cfgToken
      ? (await import("../crypto")).decryptSecret(cfgToken)
      : process.env.GITHUB_TOKEN ?? null;
    const ghConfig = ghToken ? { token: ghToken } : null;

    opts.emit({ type: "stage", label: "Loading repository source..." });
    const source = await loadSecuritySource({ projectId: opts.projectId, repoLink: opts.repoLink, project, ghConfig });
    await db.securityRun.update({
      where: { id: runId },
      data: { repoSource: source.source, repoUrl: source.repoUrl, repoBranch: source.branch, fileCount: source.fileCount },
    });

    // 2. Scan (redacted copy for scanners; raw kept in-memory only)
    assertToolAllowed({ tool: "RUN_STATIC_SCAN", role: opts.actor.role });
    const scanFiles = redactFileMap(source.files);
    opts.emit({ type: "stage", label: `Scanning ${source.fileCount} file(s)...` });
    const scanStart = Date.now();
    const rawFindings = await runAllScanners(scanFiles);
    await recordSecurityAction({
      projectId: opts.projectId, runId, actorId: opts.actor.id,
      tool: "RUN_STATIC_SCAN", action: `scan ${source.fileCount} files`,
      result: { findingCount: rawFindings.length, source: source.source },
      durationMs: Date.now() - scanStart,
    });

    if (!rawFindings.length) {
      await finishRun(runId, {
        status: "COMPLETED",
        summary: `No vulnerabilities found across ${source.fileCount} file(s).`,
        fileCount: source.fileCount,
        findingCount: 0,
        durationMs: Date.now() - started,
      });
      opts.emit({ type: "reply", text: "✅ Scan complete — no vulnerabilities found." });
      return runId;
    }

    // 3. Persist raw findings (dedupe by fingerprint against open findings)
    const emitFinding = (row: { id: string; ruleId: string; title: string; severity: string; filePath: string | null }) =>
      opts.emit({
        type: "finding",
        finding: { id: row.id, ruleId: row.ruleId, title: row.title, severity: row.severity as "critical" | "high" | "medium" | "low", filePath: row.filePath ?? undefined },
      });

    const persisted: { id: string; raw: RawFinding }[] = [];
    for (const raw of rawFindings) {
      const fingerprint = fingerprintOf({ ruleId: raw.ruleId, filePath: raw.filePath, lineStart: raw.lineStart, extra: raw.components?.[0]?.name ?? null });
      const existing = await db.securityFinding.findFirst({
        where: { projectId: opts.projectId, fingerprint, status: { notIn: ["FALSE_POSITIVE", "VERIFIED", "FIXED"] } },
        select: { id: true },
      });
      if (existing) {
        persisted.push({ id: existing.id, raw });
        continue;
      }
      const row = await db.securityFinding.create({
        data: {
          runId, projectId: opts.projectId,
          ruleId: raw.ruleId, title: raw.title, category: raw.category,
          severity: raw.severity.toUpperCase() as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
          confidence: raw.confidence,
          cwe: raw.cwe ?? null, cve: raw.cve ?? null,
          filePath: raw.filePath ?? null, lineStart: raw.lineStart ?? null, lineEnd: raw.lineEnd ?? null,
          snippet: raw.snippet ? redactSecrets(raw.snippet).slice(0, 500) : null,
          rootCause: raw.rootCause ?? null,
          evidence: (raw.evidence ?? []) as unknown as Prisma.InputJsonValue,
          impact: raw.impact ?? null,
          attackPath: (raw.attackPath ?? []) as unknown as Prisma.InputJsonValue,
          components: (raw.components ?? []) as unknown as Prisma.InputJsonValue,
          fingerprint,
          status: "QUEUED",
        },
      });
      persisted.push({ id: row.id, raw });
      emitFinding(row);
    }

    // 4. AI investigation (bounded)
    const maxInv = opts.maxInvestigations ?? 8;
    const toInvestigate = persisted.filter((p) => p.raw.category !== "dependency" || p.raw.cve).slice(0, maxInv);
    opts.emit({ type: "stage", label: `Investigating ${Math.min(toInvestigate.length, maxInv)} finding(s) with AI...` });

    for (const { id, raw } of toInvestigate) {
      await db.securityFinding.update({ where: { id }, data: { status: "INVESTIGATING" } });
      try {
        const inv = await investigateFinding({ finding: raw, files: scanFiles, projectId: opts.projectId, actorId: opts.actor.id });
        const merged = applyInvestigation(raw, inv);
        await db.securityFinding.update({
          where: { id },
          data: {
            rootCause: merged.rootCause,
            evidence: merged.evidence as unknown as Prisma.InputJsonValue,
            attackPath: merged.attackPath as unknown as Prisma.InputJsonValue,
            impact: merged.impact,
            aiAnalysis: merged.aiAnalysis,
            verdict: inv.verdict,
            verdictReason: inv.reachability,
            confidence: merged.confidence,
            status: merged.status,
          },
        });
        opts.emit({ type: "investigation", findingId: id, verdict: inv.verdict, summary: inv.analysis.slice(0, 300) });
      } catch (e) {
        logger.warn("security.investigation.failed", { findingId: id, error: e instanceof Error ? e.message : String(e) });
        await db.securityFinding.update({ where: { id }, data: { status: "VALIDATION_REQUIRED", confidence: raw.confidence } });
      }
    }

    await recordSecurityAction({
      projectId: opts.projectId, runId, actorId: opts.actor.id,
      tool: "ANALYZE_CODE", action: `AI investigation of ${toInvestigate.length} finding(s)`,
      result: { investigated: toInvestigate.length },
    });

    const openCount = await db.securityFinding.count({
      where: { projectId: opts.projectId, status: { notIn: ["FALSE_POSITIVE", "VERIFIED", "FIXED"] } },
    });
    await finishRun(runId, {
      status: "COMPLETED",
      summary: `${rawFindings.length} finding(s), ${toInvestigate.length} investigated.`,
      fileCount: source.fileCount,
      findingCount: rawFindings.length,
      durationMs: Date.now() - started,
    });
    opts.emit({
      type: "reply",
      text: `🔍 Scan complete: ${rawFindings.length} finding(s) across ${source.fileCount} files (${source.source === "WORKSPACE" ? "workspace" : source.repoUrl}). ${toInvestigate.length} investigated by AI. ${openCount} open finding(s) remain.`,
    });
    return runId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("security.scan.failed", { projectId: opts.projectId, error: msg });
    await finishRun(runId, { status: "FAILED", error: msg.slice(0, 500), durationMs: Date.now() - started });
    opts.emit({ type: "error", message: msg.slice(0, 400), code: "SECURITY_SCAN_FAILED" });
    return runId;
  }
}

// Re-exported for route handlers
export { validateFinding } from "./validator";
export { generateRemediation } from "./remediation";
export { verifyFix } from "./verifier";
