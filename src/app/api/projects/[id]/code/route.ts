import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { NotFoundError } from "@/lib/errors";
import { normalizeWebsite } from "@/lib/website/schema";
import { buildExportFiles } from "@/lib/codegen/static";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const db = requireDb();
    const project = await db.project.findUnique({ where: { id: id }, select: { currentSchema: true } });
    if (!project?.currentSchema) throw new NotFoundError("Project content");
    const doc = normalizeWebsite(project.currentSchema);
    const files = buildExportFiles(doc);
    const list = Object.entries(files).map(([path, content]) => ({ path, bytes: content.length }));
    return jsonOk({ files: list, totalBytes: list.reduce((a, f) => a + f.bytes, 0) });
  } catch (e) {
    return jsonError(e);
  }
}
