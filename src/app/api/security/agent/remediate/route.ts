/**
 * POST /api/security/agent/remediate
 *
 * Generate a proposed patch (unified diff) for a finding. The patch is
 * stored as PROPOSED — never auto-merged. Body: { findingId }
 */

import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { NotFoundError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { assertToolAllowed } from "@/lib/server/security/permissions";
import { generateRemediation } from "@/lib/server/security/remediation";
import { recordSecurityAction } from "@/lib/server/security/orchestrator";
import { readAppFiles } from "@/lib/server/app/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({ findingId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await requireUserOrThrow();
    const db = requireDb();

    const finding = await db.securityFinding.findUnique({ where: { id: body.findingId } });
    if (!finding) throw new NotFoundError("Security finding");
    const { role, projectId } = await assertAccess(finding.projectId, user.id, "EDITOR");
    await rateLimit({ key: `security-remediate:${user.id}`, limit: 10, windowSec: 60 });

    assertToolAllowed({ tool: "GENERATE_PATCH", role });

    const files = await readAppFiles(projectId).catch(() => ({}) as Record<string, string>);

    const result = await generateRemediation({
      finding: {
        ruleId: finding.ruleId,
        title: finding.title,
        severity: finding.severity,
        cwe: finding.cwe,
        cve: finding.cve,
        filePath: finding.filePath,
        lineStart: finding.lineStart,
        rootCause: finding.rootCause,
        impact: finding.impact,
        aiAnalysis: finding.aiAnalysis,
        components: finding.components,
      },
      files,
      projectId,
    });

    const patch = await db.securityPatch.create({
      data: {
        findingId: finding.id,
        projectId,
        status: "PROPOSED",
        summary: result.summary,
        rootCause: result.rootCause,
        strategy: result.strategy,
        diff: result.diff,
        verificationPlan: result.verificationPlan,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    });

    await db.securityFinding.update({ where: { id: finding.id }, data: { status: "REMEDIATION_READY" } });

    await recordSecurityAction({
      projectId,
      findingId: finding.id,
      actorId: user.id,
      tool: "GENERATE_PATCH",
      action: "generated proposed patch",
      authScope: "USER",
      authorized: true,
      input: { ruleId: finding.ruleId },
      result: { patchId: patch.id, diffBytes: result.diff.length },
    });

    return jsonOk({
      patch: {
        id: patch.id,
        status: patch.status,
        summary: patch.summary,
        strategy: patch.strategy,
        diff: patch.diff,
        verificationPlan: patch.verificationPlan,
        createdAt: patch.createdAt,
      },
      findingStatus: "REMEDIATION_READY",
    });
  } catch (e) {
    return jsonError(e);
  }
}
