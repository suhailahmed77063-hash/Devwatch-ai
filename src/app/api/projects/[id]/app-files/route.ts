import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import { ValidationError } from "@/lib/errors";
import { ensureAppWorkspace, listAppFiles, getAppFile, applyFileOps, appWorkspaceMeta } from "@/lib/server/app/data";
import { assertSafePath } from "@/lib/server/app/blueprint";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");

    await ensureAppWorkspace(id);

    if (filePath) {
      const row = await getAppFile(id, assertSafePath(filePath));
      if (!row) return jsonOk({ file: null });
      return jsonOk({ file: { path: row.path, content: row.content, size: row.size, updatedAt: row.updatedAt.toISOString() } });
    }

    const [files, meta] = await Promise.all([listAppFiles(id), appWorkspaceMeta(id)]);
    return jsonOk({
      files: files.map((f) => ({ path: f.path, size: f.size, updatedAt: f.updatedAt.toISOString() })),
      meta,
    });
  } catch (e) {
    return jsonError(e);
  }
}

const createSchema = z.object({
  action: z.enum(["create", "rename", "delete"]),
  path: z.string().min(1),
  newPath: z.string().optional(),
  content: z.string().optional(),
});

const saveSchema = z.object({ path: z.string().min(1), content: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = createSchema.parse(await req.json());
    await ensureAppWorkspace(projectId);

    const path = assertSafePath(body.path);
    let labels: string[];
    switch (body.action) {
      case "create":
        labels = await applyFileOps(projectId, [{ kind: "create", path, content: body.content ?? "" }], user.id);
        break;
      case "rename":
        labels = await applyFileOps(projectId, [{ kind: "rename", path, newPath: assertSafePath(body.newPath ?? "") }], user.id);
        break;
      case "delete":
        labels = await applyFileOps(projectId, [{ kind: "delete", path }], user.id);
        break;
    }
    await logAudit({ actorId: user.id, projectId, action: `app.file.${body.action}`, entity: "AppFile", entityId: path, meta: { newPath: body.newPath } });
    return jsonOk({ ok: true, label: labels[0] });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = saveSchema.parse(await req.json());
    if (body.content.length > 400_000) throw new ValidationError("File is too large (max 400 KB).");
    const path = assertSafePath(body.path);
    await applyFileOps(projectId, [{ kind: "edit", path, content: body.content }], user.id);
    const row = await getAppFile(projectId, path);
    return jsonOk({ ok: true, size: row?.size ?? Buffer.byteLength(body.content), updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString() });
  } catch (e) {
    return jsonError(e);
  }
}