import type { Project, User } from "@prisma/client";
import type { Operation, WebsiteSchema } from "@/types/website";
import { AiProviderError, AppError, ConfigError, ValidationError } from "@/lib/errors";
import { logger } from "../logger";
import { requireDb } from "../db";
import { getLLM } from "../ai/config";
import { structured } from "../ai/structured";
import { editorResultSchema } from "./schemas";
import { buildEditorMessages, websiteSystem } from "./prompts";
import { applyPatch, OperationError } from "@/lib/website/ops";
import { operationSchema } from "@/lib/website/schema";
import { saveSchemaVersion } from "../data/versions";
import { assertPlanAllowed, recordUsage } from "../usage";
import { logAudit } from "../audit";
import { runSeoChecks } from "@/lib/seo/checks";

export type EditStageId = "analyzing" | "planning" | "applying" | "validating" | "saving" | "done";

export type EditEvent =
  | { type: "stage"; id: EditStageId; label: string }
  | { type: "log"; message: string }
  | { type: "reply"; text: string }
  | { type: "doc"; doc: WebsiteSchema }
  | { type: "error"; message: string; code: string };

export interface EditInput {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  doc: WebsiteSchema;
  userMessage: string;
  emit: (e: EditEvent) => void;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface EditResult {
  doc: WebsiteSchema;
  reply: string;
  appliedOps: number;
  summary: string;
  version: number | null;
}

export async function runAiEdit(input: EditInput): Promise<EditResult> {
  const db = requireDb();
  const startedAt = Date.now();

  input.emit({ type: "stage", id: "analyzing", label: "Analyzing request…" });
  const userMessage = input.userMessage.trim().slice(0, 4000);
  if (userMessage.length < 2) throw new ValidationError("Type a message for the AI first.");

  await assertPlanAllowed("AI_GENERATION", { user: input.actor, projectId: input.project.id });
  await recordUsage({ userId: input.actor.id, kind: "AI_GENERATION" });

  const generation = await db.generation.create({
    data: { projectId: input.project.id, userId: input.actor.id, kind: "EDIT", status: "RUNNING", prompt: userMessage },
  });

  try {
    input.emit({ type: "stage", id: "planning", label: "Planning changes…" });
    const { system, user } = buildEditorMessages({ doc: input.doc, history: input.history ?? [] }, userMessage);
    const result = await structured(() => getLLM(input.project), {
      label: "edit patch",
      schema: editorResultSchema,
      request: { system: `${websiteSystem()}\n${system}`, user, maxTokens: 5000, temperature: 0.3 },
    });

    const parseOps = (raws: unknown[]): Operation[] => {
      const ops: Operation[] = [];
      for (const raw of raws) {
        const parsed = operationSchema.safeParse(raw);
        if (parsed.success) ops.push(parsed.data as unknown as Operation);
        else logger.warn("ai.edit.op_invalid", { error: parsed.error.issues[0]?.message ?? "invalid op" });
      }
      return ops;
    };

    const ops = parseOps(result.data.ops);
    if (!ops.length) {
      const reply =
        result.data.reply ||
        "I couldn't map that request onto the current site. Try being more specific (e.g. “change the hero heading”, “add a pricing section”, “make the navbar sticky”).";
      await db.generation.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          result: { ops: 0, note: "no ops applied" },
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          model: result.model,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });
      input.emit({ type: "reply", text: reply });
      return { doc: input.doc, reply, appliedOps: 0, summary: "No changes applied", version: null };
    }

    input.emit({ type: "stage", id: "applying", label: "Applying changes…" });
    let next: WebsiteSchema;
    let appliedOps = ops.length;
    try {
      next = applyPatch(input.doc, ops);
    } catch (e) {
      if (e instanceof OperationError) {
        // one repair attempt with the concrete operation error
        const retry = await structured(() => getLLM(input.project), {
          label: "edit patch (repair)",
          schema: editorResultSchema,
          request: {
            system: `${websiteSystem()}\n${system}`,
            user: `${user}\n\nYour previous patch failed: ${e.message}. Return a corrected complete response.`,
            maxTokens: 5000,
            temperature: 0.2,
          },
        });
        const ops2 = parseOps(retry.data.ops);
        if (!ops2.length) throw new ValidationError("The AI couldn't apply those changes to the current page structure. Please rephrase.");
        next = applyPatch(input.doc, ops2);
        appliedOps = ops2.length;
      } else {
        throw e;
      }
    }

    input.emit({ type: "stage", id: "validating", label: "Validating design…" });
    const report = runSeoChecks(next);
    const brokeSeo = report.checks.filter((c) => !c.ok && c.weight >= 8).length;
    if (brokeSeo) input.emit({ type: "log", message: `Post-edit review: ${brokeSeo} high-impact check${brokeSeo === 1 ? "" : "s"} could be improved.` });

    input.emit({ type: "stage", id: "saving", label: "Saving & refreshing preview…" });
    const summaryText = (result.data.summary || "AI edit").slice(0, 200);
    const { versionNumber } = await saveSchemaVersion({
      projectId: input.project.id,
      schema: next,
      message: summaryText,
      createdById: input.actor.id,
      createVersion: true,
    });

    // persist the chat exchange under the project's active conversation
    const conversation =
      (await db.aIConversation.findFirst({
        where: { projectId: input.project.id, userId: input.actor.id },
        orderBy: { updatedAt: "desc" },
      })) ??
      (await db.aIConversation.create({ data: { projectId: input.project.id, userId: input.actor.id } }));
    await db.aIMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "USER", content: userMessage },
        { conversationId: conversation.id, role: "ASSISTANT", content: result.data.reply, meta: { ops: appliedOps, summary: summaryText } },
      ],
    });

    const tokens = result.tokensIn + result.tokensOut;
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        model: result.model,
        result: { ops: appliedOps, summary: summaryText, seoScore: report.score },
      },
    });
    await logAudit({ actorId: input.actor.id, projectId: input.project.id, action: "ai.edit", entity: "Generation", entityId: generation.id, meta: { ops: appliedOps, tokens } });

    input.emit({ type: "log", message: `Applied ${appliedOps} change${appliedOps === 1 ? "" : "s"} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.` });
    input.emit({ type: "doc", doc: next });
    input.emit({ type: "reply", text: result.data.reply });
    return { doc: next, reply: result.data.reply, appliedOps, summary: summaryText, version: versionNumber };
  } catch (e) {
    logger.error("ai.edit.failed", { projectId: input.project.id, error: e instanceof Error ? e.message : String(e) });
    const err = e instanceof AppError ? e : new AiProviderError("edit failed", "I couldn't complete that change. Please try again or rephrase.");
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", error: err.publicMessage.slice(0, 400), finishedAt: new Date(), durationMs: Date.now() - startedAt },
    });
    input.emit({ type: "error", message: err.publicMessage, code: "EDIT_FAILED" });
    throw err;
  }
}
