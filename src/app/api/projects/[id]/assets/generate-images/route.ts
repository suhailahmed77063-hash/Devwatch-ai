import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { getImageProvider } from "@/lib/server/ai/config";
import { assertPlanAllowed, recordUsage } from "@/lib/server/usage";
import { createAsset } from "@/lib/server/data/assets";
import { ConfigError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const parsed = schema.parse(await req.json());
    await assertPlanAllowed("IMAGE_GENERATION", { user, projectId });

    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
    const provider = getImageProvider(project);
    if (!provider) {
      throw new ConfigError("AI image generation is not configured.", "The AI image provider isn't configured. Add an OPENAI_API_KEY (with image model access) to your .env.local.");
    }
    const images = await provider.generate({ prompt: parsed.prompt, n: 1 });
    const first = images[0];
    if (!first) throw new Error("Image provider returned no results");

    const assetId = await createAsset({
      projectId,
      ownerId: user.id,
      name: parsed.prompt.slice(0, 60),
      externalUrl: first.url,
      mimeType: "image/png",
      kind: "IMAGE",
      aiGenerated: true,
      width: first.width ?? null,
      height: first.height ?? null,
    });
    await recordUsage({ userId: user.id, kind: "IMAGE_GENERATION", meta: { prompt: parsed.prompt.slice(0, 200), assetId } });
    return jsonOk({ id: assetId, url: first.url, prompt: parsed.prompt }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
