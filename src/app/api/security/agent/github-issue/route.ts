/**
 * POST /api/security/agent/github-issue
 *
 * Creates a GitHub issue from a finding using the existing GitHub client.
 * Admin/super_admin only (matches the tool policy for CREATE_GITHUB_ISSUE).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentActions, repositories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSecurityActor, loadFindingForActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { assertToolAllowed, PermissionDeniedError } from "@/lib/security-agent/permissions";
import { createSecurityIssue } from "@/lib/security-agent/github";

const bodySchema = z.object({
  findingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getSecurityActor();
    const body = bodySchema.parse(await request.json());
    const finding = await loadFindingForActor(body.findingId, actor);

    assertToolAllowed({ tool: "CREATE_GITHUB_ISSUE", role: actor.role });

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

    const issue = await createSecurityIssue({
      owner,
      repo,
      token: actor.githubToken,
      finding: {
        title: finding.description,
        severity: finding.severity,
        verdict: finding.verdict,
        cweId: finding.cweId,
        cveId: finding.cveId,
        file: finding.file,
        line: finding.line,
        rootCause: finding.rootCause,
        impact: finding.impact,
        recommendation: finding.recommendation,
        aiAnalysis: finding.aiAnalysis,
      },
    });

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "CREATE_GITHUB_ISSUE",
      action: "issue_created",
      result: JSON.stringify({ issueUrl: issue.issueUrl, issueNumber: issue.issueNumber }),
    });

    return NextResponse.json(issue);
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return agentErrorResponse(err);
  }
}
