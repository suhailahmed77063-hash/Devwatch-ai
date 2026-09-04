import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { NotFoundError } from "@/lib/errors";
import { jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { runGenerateWebsite } from "@/lib/server/agents/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  prompt: z.string().min(1).max(8000),
  fillImages: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const parsed = bodySchema.parse(await req.json());
    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

    return createSseStream(async (push) => {
      await runGenerateWebsite({
        project,
        actor: { id: user.id, plan: user.plan },
        prompt: parsed.prompt,
        emit: push,
        fillImages: parsed.fillImages,
      });
    });
  } catch (e) {
    return jsonError(e);
  }
}
