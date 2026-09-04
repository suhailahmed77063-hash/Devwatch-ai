import JSZip from "jszip";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { normalizeWebsite } from "@/lib/website/schema";
import { buildExportFiles } from "@/lib/codegen/static";
import { jsonError } from "@/lib/server/http";
import { PLANS } from "@/lib/constants";
import { UpgradeRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");

    const db = requireDb();
    const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!PLANS[me.plan].codeExport) {
      throw new UpgradeRequiredError("Code export is a Pro feature.", "Code export is a Pro feature. Upgrade in Settings → Subscription to download your project code.");
    }
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
    const doc = normalizeWebsite(project.currentSchema ?? project.currentSchema);
    const files = buildExportFiles(doc);

    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const { recordUsage } = await import("@/lib/server/usage");
    await recordUsage({ userId: user.id, kind: "CODE_EXPORT", meta: { projectId } }).catch(() => {});

    return new Response(new Blob([new Uint8Array(buffer)], { type: "application/zip" }), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.slug}-webforge.zip"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
