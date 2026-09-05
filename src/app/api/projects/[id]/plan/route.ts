import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { getAgentLLM } from "@/lib/server/ai/config";
import { structured } from "@/lib/server/ai/structured";
import { readAppFiles } from "@/lib/server/app/data";
import { appPlanSchema } from "@/lib/server/app/blueprint";
import { appSystem, buildAgentPlanPrompt, clampPrompt, compactHistory, fileIndex } from "@/lib/server/app/prompts";
import { storePendingPlan, consumePendingPlan, peekPendingPlan, deletePendingPlan, type PendingPlan } from "@/lib/server/ai/plan-store";
import { hasRealFiles } from "@/lib/server/app/templates";
import { recordUsage } from "@/lib/server/usage";

export const dynamic = "force-dynamic";

/**
 * POST /api/projects/:id/plan
 *
 * Actions:
 *   generate — Generate a plan from user message, store it, return it
 *   approve  — Execute an approved plan
 *   reject   — Delete a pending plan
 *   status   — Check if a plan is still pending
 */

const generateSchema = z.object({
  action: z.literal("generate"),
  message: z.string().min(1).max(4000),
});

const approveSchema = z.object({
  action: z.literal("approve"),
  planId: z.string(),
});

const rejectSchema = z.object({
  action: z.literal("reject"),
  planId: z.string(),
});

const statusSchema = z.object({
  action: z.literal("status"),
  planId: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = await req.json();
    const action = body.action as string;

    // ── Generate plan ──
    if (action === "generate") {
      const parsed = generateSchema.parse(body);
      const message = clampPrompt(parsed.message);
      const files = await readAppFiles(projectId);
      const isNew = !hasRealFiles(files);

      const db = requireDb();

      // Get conversation history
      const conversation = await db.aIConversation.findFirst({
        where: { projectId, userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 6 } },
      });
      const history = (conversation?.messages ?? [])
        .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
        .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));

      if (isNew) {
        // For new projects, generate a blueprint-style plan
        const { blueprintSchema } = await import("@/lib/server/app/blueprint");
        const { buildBlueprintPrompt } = await import("@/lib/server/app/prompts");

        const bp = await structured(() => getAgentLLM({ id: projectId } as any), {
          label: "app blueprint",
          schema: blueprintSchema,
          request: { system: appSystem(), user: buildBlueprintPrompt(message), maxTokens: 4096 },
        });

        await recordUsage({ userId: user.id, kind: "AI_TOKENS", amount: bp.tokensIn + bp.tokensOut }).catch(() => {});

        const steps = [
          `🏗️ Design: ${bp.data.name} — ${bp.data.description}`,
          `📦 Modules: ${bp.data.modules.join(", ") || "core"}`,
          `🗄️ Database: ${bp.data.dataModels.map((m) => m.name).join(", ") || "none"}`,
          `🔌 API: ${bp.data.apiRoutes.length} endpoints`,
          `📄 Pages: ${bp.data.pages.join(", ") || "none"}`,
          `🔐 Env: ${bp.data.envRequirements.map((e) => e.name).join(", ") || "none"}`,
          "📝 Generate all source files",
          "✅ Run automated QA",
          "🚀 Auto-deploy to production",
        ];

        const planId = storePendingPlan({
          projectId,
          steps,
          operations: [], // Will be populated during execution
          summary: `Generate "${bp.data.name}" — ${bp.data.modules.join(", ")}`,
          runTests: true,
          message,
        });

        return NextResponse.json({
          planId,
          plan: {
            steps,
            summary: `Generate "${bp.data.name}" — ${bp.data.description}`,
            isNewProject: true,
            blueprint: bp.data,
          },
        });
      }

      // For existing projects, generate an edit plan
      const runs = await db.appRun.findMany({
        where: { projectId },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: { status: true, summary: true },
      });
      const lastRunCtx = runs[0]
        ? `last run: ${runs[0].status}${runs[0].summary ? ` — ${runs[0].summary}` : ""}`
        : "no QA run yet";
      const historyCtx = compactHistory(history);
      const index = fileIndex(files);

      const plan = await structured(() => getAgentLLM({ id: projectId } as any), {
        label: "agent plan",
        schema: appPlanSchema,
        request: {
          system: appSystem(),
          user: buildAgentPlanPrompt({ files, lastRun: lastRunCtx, message, history: historyCtx }),
          maxTokens: 8192,
        },
      });

      await recordUsage({ userId: user.id, kind: "AI_TOKENS", amount: plan.tokensIn + plan.tokensOut }).catch(() => {});

      const planId = storePendingPlan({
        projectId,
        steps: plan.data.steps,
        operations: plan.data.operations.map((op: any) => ({
          kind: op.kind,
          path: op.path,
          content: op.content,
          newPath: op.newPath,
        })),
        summary: plan.data.summary || `Edit: ${message.slice(0, 100)}`,
        runTests: plan.data.runTests,
        message,
      });

      return NextResponse.json({
        planId,
        plan: {
          steps: plan.data.steps,
          summary: plan.data.summary,
          operations: plan.data.operations.map((op: any) => ({
            kind: op.kind,
            path: op.path,
          })),
          runTests: plan.data.runTests,
          fileCount: index.length,
        },
      });
    }

    // ── Approve plan ──
    if (action === "approve") {
      const parsed = approveSchema.parse(body);
      const plan = consumePendingPlan(projectId, parsed.planId);
      if (!plan) {
        return NextResponse.json({ error: "Plan not found or expired" }, { status: 404 });
      }
      return NextResponse.json({ success: true, plan });
    }

    // ── Reject plan ──
    if (action === "reject") {
      const parsed = rejectSchema.parse(body);
      deletePendingPlan(projectId, parsed.planId);
      return NextResponse.json({ success: true, message: "Plan rejected" });
    }

    // ── Status check ──
    if (action === "status") {
      const parsed = statusSchema.parse(body);
      const plan = peekPendingPlan(projectId, parsed.planId);
      if (!plan) {
        return NextResponse.json({ status: "expired" });
      }
      return NextResponse.json({ status: "pending", steps: plan.steps });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    logger.error("plan.error", { error: (e as Error).message });
    return jsonError(e);
  }
}
