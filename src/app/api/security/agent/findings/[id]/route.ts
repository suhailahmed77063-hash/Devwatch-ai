/**
 * GET /api/security/agent/findings/:id
 *
 * Full finding detail: investigation, evidence, attack path, validations,
 * patches, verifications and the audit history (SecurityAction rows).
 */

import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { NotFoundError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const db = requireDb();

    const finding = await db.securityFinding.findUnique({
      where: { id },
      include: {
        run: { select: { id: true, repoSource: true, repoUrl: true, repoBranch: true, startedAt: true } },
        validations: { orderBy: { startedAt: "desc" }, take: 10 },
        patches: { orderBy: { createdAt: "desc" }, take: 10 },
        verifications: { orderBy: { startedAt: "desc" }, take: 10 },
        actions: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!finding) throw new NotFoundError("Security finding");

    // Organization isolation: viewer+ role on the owning project.
    await assertAccess(finding.projectId, user.id, "VIEWER");

    return jsonOk({ finding });
  } catch (e) {
    return jsonError(e);
  }
}
