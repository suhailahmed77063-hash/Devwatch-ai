import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { getProject, deleteProject } from "@/lib/server/data/projects";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const project = await getProject(id);
    return jsonOk(project);
  } catch (e) {
    return jsonError(e);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  status: z.enum(["DRAFT", "READY", "ARCHIVED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "ADMIN");
    const body = patchSchema.parse(await req.json());
    const { requireDb } = await import("@/lib/server/db");
    const db = requireDb();
    await db.project.update({
      where: { id: projectId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    if (body.name) {
      const { logAudit } = await import("@/lib/server/audit");
      await logAudit({ actorId: user.id, projectId, action: "project.rename", entity: "Project", entityId: projectId, meta: { name: body.name } });
    }
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "OWNER");
    await deleteProject(projectId, user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
