/**
 * GET /api/security/agent/runs?projectId=...
 *
 * List agent runs for a project (newest first) with finding counts.
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

    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 50);
    const runs = await db.securityRun.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { createdBy: { select: { name: true, email: true } } },
    });

    return jsonOk({
      runs: runs.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        repoSource: r.repoSource,
        repoUrl: r.repoUrl,
        fileCount: r.fileCount,
        findingCount: r.findingCount,
        summary: r.summary,
        error: r.error,
        durationMs: r.durationMs,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        createdBy: r.createdBy?.name ?? r.createdBy?.email ?? null,
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
