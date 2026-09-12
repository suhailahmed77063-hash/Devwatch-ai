/**
 * GET /api/security/agent/findings?projectId=...[&status=][&severity=]
 *
 * List findings for a project (isolation-enforced), newest first.
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

    const status = url.searchParams.get("status");
    const severity = url.searchParams.get("severity");

    const findings = await db.securityFinding.findMany({
      where: {
        projectId,
        ...(status ? { status: status as never } : {}),
        ...(severity ? { severity: severity as never } : {}),
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return jsonOk({
      findings: findings.map((f) => ({
        id: f.id,
        ruleId: f.ruleId,
        title: f.title,
        category: f.category,
        severity: f.severity,
        confidence: f.confidence,
        cwe: f.cwe,
        cve: f.cve,
        filePath: f.filePath,
        lineStart: f.lineStart,
        verdict: f.verdict,
        status: f.status,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
