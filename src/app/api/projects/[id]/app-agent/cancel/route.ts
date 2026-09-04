import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import { cancelAppRun } from "@/lib/server/app/cancel";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ runId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "EDITOR");
    const body = bodySchema.parse(await req.json());
    cancelAppRun(body.runId);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}