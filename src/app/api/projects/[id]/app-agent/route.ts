import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { rateLimit } from "@/lib/server/rate-limit";
import { createAppRun, applyFileOps } from "@/lib/server/app/data";
import { runCodingAgent, runGenerateApp, type AppEvent } from "@/lib/server/app/agent";
import { consumePendingPlan } from "@/lib/server/ai/plan-store";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  planId: z.string().optional(), // If provided, this is a plan execution
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const parsed = bodySchema.parse(await req.json());
    await rateLimit({ key: `app-agent:${user.id}`, limit: 15, windowSec: 60 });
    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

    // last few exchanges for real context
    const conversation = await db.aIConversation.findFirst({
      where: { projectId, userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 6 } },
    });
    const history = (conversation?.messages ?? [])
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));

    return createSseStream(async (push) => {
      const runId = await createAppRun({ projectId, kind: "agent", createdById: user.id });
      push({ type: "runId", runId });
      const emit = (e: AppEvent) => push({ ...e });

      // ── Plan execution mode ──
      if (parsed.planId) {
        const plan = consumePendingPlan(projectId, parsed.planId);
        if (!plan) {
          push({ type: "error", message: "Plan not found or expired. Please generate a new plan.", code: "PLAN_EXPIRED" });
          push({ type: "done" });
          return;
        }

        try {
          emit({ type: "plan", steps: plan.steps });

          // Execute the plan
          if (plan.operations.length > 0) {
            emit({ type: "stage", label: "Applying planned changes..." });
            const { validateOps } = await import("@/lib/server/app/blueprint");
            const validated = validateOps(plan.operations as any);
            const labels = await applyFileOps(projectId, validated, user.id);
            for (const l of labels) emit({ type: "op", label: l });

            emit({ type: "reply", text: `✅ Plan executed — ${labels.length} file(s) changed. ${plan.summary}` });
          } else {
            // New project generation plan — use the existing generate flow
            emit({ type: "stage", label: "Generating application from approved plan..." });
            await runGenerateApp({ project, actor: { id: user.id, plan: user.plan }, runId, emit, prompt: plan.message });
            return; // runGenerateApp handles its own done event
          }

          emit({ type: "done" });
        } catch (e) {
          logger.error("plan.execute.failed", { projectId, error: (e as Error).message });
          emit({ type: "error", message: (e as Error).message || "Plan execution failed", code: "PLAN_EXECUTION_FAILED" });
          emit({ type: "done" });
        }
        return;
      }

      // ── Normal mode ──
      try {
        await runCodingAgent({
          project,
          actor: { id: user.id, plan: user.plan },
          runId,
          emit,
          message: parsed.message,
          history,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        push({ type: "error", message: msg, code: "APP_AGENT_FAILED" });
        push({ type: "done" });
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}
