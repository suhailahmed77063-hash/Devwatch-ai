import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import { listEnvVars, setEnvVar, deleteEnvVar } from "@/lib/server/app/data";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const vars = await listEnvVars(id);
    return jsonOk({ vars });
  } catch (e) {
    return jsonError(e);
  }
}

const setSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.string().max(4000),
  isSecret: z.boolean().default(true),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = setSchema.parse(await req.json());
    await setEnvVar(projectId, body.name, body.value, body.isSecret);
    await logAudit({ actorId: user.id, projectId, action: "app.env.set", entity: "EnvironmentVariable", entityId: body.name.toUpperCase(), meta: { secret: body.isSecret } });
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

const deleteSchema = z.object({ name: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = deleteSchema.parse(await req.json());
    await deleteEnvVar(projectId, body.name.toUpperCase());
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}