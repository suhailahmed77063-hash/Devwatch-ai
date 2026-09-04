import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { rateLimit } from "@/lib/server/rate-limit";
import { createAppRun } from "@/lib/server/app/data";
import { runCodingAgent, type AppEvent } from "@/lib/server/app/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
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
      // Publish the run id first so the client can cancel this run.
      push({ type: "runId", runId });
      const emit = (e: AppEvent) => push({ ...e });
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