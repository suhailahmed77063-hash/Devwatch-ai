/**
 * POST /api/security/agent/verify
 *
 * Runs the Verification Agent after a fix is applied: fresh repository scan
 * + fingerprint comparison. Shows Before Fix 🔴 / After Fix 🟢 and any
 * remaining risks. Only meaningful once a patch has been applied by a
 * developer through their normal workflow.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentVerifications, agentActions, securityFindings, repositories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSecurityActor, loadFindingForActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { verifyFix } from "@/lib/security-agent/verifier";

export const maxDuration = 300;

const bodySchema = z.object({
  findingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getSecurityActor();
    const body = bodySchema.parse(await request.json());
    const finding = await loadFindingForActor(body.findingId, actor);

    if (!finding.repoId) {
      return NextResponse.json({ error: "Finding is not linked to a repository" }, { status: 400 });
    }

    const rows = await db.select().from(repositories).where(eq(repositories.id, finding.repoId)).limit(1);
    const repoRow = rows[0];
    if (!repoRow || repoRow.orgId !== actor.orgId) {
      return NextResponse.json({ error: "Repository not found in this organization" }, { status: 404 });
    }
    const [owner, repo] = repoRow.fullName.split("/");
    if (!owner || !repo) {
      return NextResponse.json({ error: "Repository full name is invalid" }, { status: 400 });
    }

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "ANALYZE_CODE",
      action: "verification_started",
      input: JSON.stringify({ ruleId: finding.ruleId, repo: repoRow.fullName }),
    });

    const outcome = await verifyFix({
      owner,
      repo,
      branch: repoRow.defaultBranch ?? "main",
      token: actor.githubToken,
      target: {
        ruleId: finding.ruleId ?? "unknown",
        filePath: finding.file ?? undefined,
        lineStart: finding.line ?? undefined,
        extra: finding.fingerprint ?? null,
      },
      fixedAt: finding.fixedAt ?? new Date(),
    });

    const [verification] = await db
      .insert(agentVerifications)
      .values({
        findingId: finding.id,
        orgId: actor.orgId,
        status: outcome.status,
        beforeState: "present",
        rescan: {
          fileCount: outcome.rescanFileCount,
          remainingCount: outcome.remainingFindings.length,
          remaining: outcome.remainingFindings.slice(0, 10),
        },
        testsPassed: outcome.status === "fixed" ? true : outcome.status === "still_vulnerable" ? false : null,
        remainingRisks: outcome.remainingFindings.slice(0, 10),
        summary: outcome.summary,
        error: outcome.error ?? null,
        finishedAt: new Date(),
      })
      .returning();

    await db
      .update(securityFindings)
      .set({
        agentStatus: outcome.status === "fixed" ? ("verified" as const) : ("confirmed" as const),
        fixedAt: outcome.status === "fixed" ? new Date() : null,
      })
      .where(eq(securityFindings.id, finding.id));

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "ANALYZE_CODE",
      action: "verification_completed",
      result: JSON.stringify({ status: outcome.status }),
    });

    return NextResponse.json({
      verification: {
        id: verification.id,
        status: verification.status,
        beforeState: "present",
        stillDetected: outcome.stillDetected,
        rescanFileCount: outcome.rescanFileCount,
        remainingRisks: outcome.remainingFindings.slice(0, 10),
        summary: verification.summary,
      },
    });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
