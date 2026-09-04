import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { ValidationError } from "@/lib/errors";
import { jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { runAiEdit } from "@/lib/server/agents/editor";
import { normalizeWebsite } from "@/lib/website/schema";

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
    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
    if (!project.currentSchema) {
      throw new ValidationError("Nothing to edit yet — generate a website first.", "This project has no website yet. Generate one first, then chat to refine it.");
    }
    const doc = normalizeWebsite(project.currentSchema);

    // last few exchanges for context (real stored history)
    const conversation = await db.aIConversation.findFirst({
      where: { projectId, userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 6 } },
    });
    const history = (conversation?.messages ?? [])
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => ({ role: m.role === "USER" ? "user" as const : "assistant" as const, content: m.content }));

    return createSseStream(async (push) => {
      await runAiEdit({
        project,
        actor: { id: user.id, plan: user.plan },
        doc,
        userMessage: parsed.message,
        emit: push,
        history,
      });
    });
  } catch (e) {
    return jsonError(e);
  }
}
