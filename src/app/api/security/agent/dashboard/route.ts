/**
 * GET /api/security/agent/dashboard?projectId=...
 *
 * Security overview for the dashboard: severity/status counts, verdicts,
 * recent runs and recent agent activity (audit trail).
 */

import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { ValidationError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireUserOrThrow();
    const db = requireDb();
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) throw new ValidationError("projectId is required");
    await assertAccess(projectId, user.id, "VIEWER");

    const [severityCounts, statusCounts, verdictCounts, recentRuns, recentActions, latestValidations] = await Promise.all([
      db.securityFinding.groupBy({ by: ["severity"], _count: true, where: { projectId } }),
      db.securityFinding.groupBy({ by: ["status"], _count: true, where: { projectId } }),
      db.securityFinding.groupBy({ by: ["verdict"], _count: true, where: { projectId } }),
      db.securityRun.findMany({
        where: { projectId },
        orderBy: { startedAt: "desc" },
        take: 8,
        select: { id: true, kind: true, status: true, findingCount: true, fileCount: true, repoUrl: true, repoSource: true, summary: true, startedAt: true },
      }),
      db.securityAction.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, tool: true, action: true, status: true, environment: true, authorized: true, createdAt: true },
      }),
      db.securityValidation.findMany({
        where: { projectId },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { id: true, findingId: true, status: true, exploitReproduced: true, environment: true, finishedAt: true },
      }),
    ]);

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const row of severityCounts) {
      const key = row.severity.toLowerCase() as keyof typeof bySeverity;
      if (key in bySeverity) bySeverity[key] = row._count;
    }

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) byStatus[row.status] = row._count;

    const byVerdict: Record<string, number> = {};
    for (const row of verdictCounts) if (row.verdict) byVerdict[row.verdict] = row._count;

    return jsonOk({
      overview: {
        total: Object.values(bySeverity).reduce((a, b) => a + b, 0),
        bySeverity,
        byStatus,
        byVerdict,
        confirmedExploitable: byStatus.CONFIRMED ?? 0,
        fixed: (byStatus.FIXED ?? 0) + (byStatus.VERIFIED ?? 0),
        falsePositives: byStatus.FALSE_POSITIVE ?? 0,
        pendingVerification: (byStatus.REMEDIATION_READY ?? 0) + (byStatus.CONFIRMED ?? 0),
      },
      recentRuns,
      recentActions,
      latestValidations,
    });
  } catch (e) {
    return jsonError(e);
  }
}
