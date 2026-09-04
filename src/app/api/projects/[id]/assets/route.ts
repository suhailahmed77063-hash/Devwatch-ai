import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { listAssets, createAsset, deleteAsset } from "@/lib/server/data/assets";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const assets = await listAssets(id);
    return jsonOk({ assets });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
      return jsonError(new Error("Missing file field"));
    }
    const buf = Buffer.from(await (file as File).arrayBuffer());
    if (buf.length === 0) return jsonError(new Error("Empty file"));
    if (buf.length > 15 * 1024 * 1024) return jsonError(new Error("File must be under 15 MB"));
    const mime = (file as File).type || "application/octet-stream";
    const fileName = (file as File).name || "upload";

    const assetId = await createAsset({
      projectId,
      ownerId: user.id,
      name: fileName.replace(/\.[^.]+$/, "").slice(0, 80),
      data: buf,
      mimeType: mime,
      kind: mime.startsWith("image/") ? "IMAGE" : "FILE",
    });
    return jsonOk({ id: assetId }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const url = new URL(req.url);
    const assetId = url.searchParams.get("assetId");
    if (!assetId) return jsonError(new Error("Missing assetId query param"));
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    await deleteAsset(projectId, assetId);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
