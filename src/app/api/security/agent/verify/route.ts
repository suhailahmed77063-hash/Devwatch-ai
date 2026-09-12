/**
 * POST /api/security/agent/verify
 *
 * After a developer applies a fix: re-run the scanners and re-run the safe
 * validation, then persist the before/after comparison. Body:
 * { findingId, patchId?, authorized }
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { NotFoundError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { assertToolAllowed } from "@/lib/server/security/permissions";
import { verifyFix } from "@/lib/server/security/verifier";
import { recordSecurityAction } from "@/lib/server/security/orchestrator";
import { readAppFiles } from "@/lib/server/app/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  findingId: z.string().min(1),
  patchId: z.string().optional(),
  authorized: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await requireUserOrThrow();
    const db = requireDb();

    const finding = await db.securityFinding.findUnique({ where: { id: body.findingId } });
    if (!finding) throw new NotFoundError("Security finding");
    const { role, projectId } = await assertAccess(finding.projectId, user.id, "EDITOR");
    await rateLimit({ key: `security-verify:${user.id}`, limit: 10, windowSec: 60 });

    assertToolAllowed({ tool: "RUN_STATIC_SCAN", role });

    const files = await readAppFiles(projectId).catch(() => ({}) as Record<string, string>);

    const result = await verifyFix({
      projectId,
      finding: {
        id: finding.id,
        ruleId: finding.ruleId,
        title: finding.title,
        severity: finding.severity.toLowerCase() as "critical" | "high" | "medium" | "low",
        confidence: finding.confidence,
        cwe: finding.cwe,
        cve: finding.cve,
        filePath: finding.filePath,
        lineStart: finding.lineStart,
        rootCause: finding.rootCause,
        impact: finding.impact,
        components: finding.components,
      },
      files,
      authorized: body.authorized,
      authorizedBy: user.id,
    });

    const verification = await db.securityVerification.create({
      data: {
        findingId: finding.id,
        projectId,
        patchId: body.patchId ?? null,
        status: result.status,
        beforeState: result.beforeState,
        rescan: result.rescan as unknown as Prisma.InputJsonValue,
        testsPassed: result.tests?.passed ?? null,
        testOutput: result.tests?.output ?? null,
        remainingRisks: result.remainingRisks as unknown as string[],
        summary: result.summary,
        error: result.error ?? null,
        durationMs: result.durationMs,
        finishedAt: new Date(),
      },
    });

    // Status transition: verified only when fixed; otherwise stays visible.
    await db.securityFinding.update({
      where: { id: finding.id },
      data: {
        status: result.status === "FIXED" ? "VERIFIED" : "CONFIRMED",
        fixedAt: result.status === "FIXED" ? new Date() : finding.fixedAt,
      },
    });

    await recordSecurityAction({
      projectId,
      findingId: finding.id,
      actorId: user.id,
      tool: "RUN_STATIC_SCAN",
      action: `verification → ${result.status}`,
      authScope: body.authorized ? "EXPLICIT" : "USER",
      authorized: body.authorized,
      result: { status: result.status, reproduced: result.rescan.reproduced },
      error: result.error,
      durationMs: result.durationMs,
    });

    return jsonOk({
      verification: {
        id: verification.id,
        status: verification.status,
        beforeState: verification.beforeState,
        rescan: verification.rescan,
        testsPassed: verification.testsPassed,
        remainingRisks: verification.remainingRisks,
        summary: verification.summary,
        finishedAt: verification.finishedAt,
      },
      findingStatus: result.status === "FIXED" ? "VERIFIED" : "CONFIRMED",
    });
  } catch (e) {
    return jsonError(e);
  }
}
