import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { listVersions, restoreVersion } from "@/lib/server/data/versions";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const versions = await listVersions(id);
    return jsonOk({ versions });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const { versionId } = (await req.json().catch(() => ({}))) as { versionId?: string };
    if (!versionId) return jsonError(new Error("versionId required"));
    const version = await restoreVersion(projectId, versionId, user.id);
    return jsonOk({ ok: true, version });
  } catch (e) {
    return jsonError(e);
  }
}
