import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { normalizeWebsite } from "@/lib/website/schema";
import { runSeoChecks } from "@/lib/seo/checks";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "VIEWER");
    const db = requireDb();
    const project = await db.project.findUnique({ where: { id: projectId }, select: { currentSchema: true } });
    if (!project?.currentSchema) throw new NotFoundError("Project content");
    const doc = normalizeWebsite(project.currentSchema);
    const report = runSeoChecks(doc);
    return jsonOk({ score: report.score, checks: report.checks, doc: { name: doc.metadata.name, pages: doc.pages.length } });
  } catch (e) {
    void ValidationError;
    return jsonError(e);
  }
}
