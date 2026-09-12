/**
 * POST /api/security/agent/remediate
 *
 * Generates a remediation plan + proposed unified diff for a finding.
 * The patch is stored as a proposal — it is never merged automatically.
 * Requires the source repository to fetch the affected file content.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentPatches, agentActions, securityFindings, repositories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSecurityActor, loadFindingForActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { assertToolAllowed, PermissionDeniedError } from "@/lib/security-agent/permissions";
import { generateRemediation } from "@/lib/security-agent/remediation";
import { unifiedDiff, diffStat, redactSecrets } from "@/lib/security-agent/utils";
import { loadRepoSource } from "@/lib/security-agent/source";

export const maxDuration = 180;

const bodySchema = z.object({
  findingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getSecurityActor();
    const body = bodySchema.parse(await request.json());
    const finding = await loadFindingForActor(body.findingId, actor);

    const { environment } = assertToolAllowed({ tool: "GENERATE_PATCH", role: actor.role, explicitAuth: true });

    // Resolve the owning repository for source access.
    let owner: string | undefined;
    let repo: string | undefined;
    let branch: string | undefined;
    let repoLink: string | null = null;

    if (finding.repoId) {
      const rows = await db.select().from(repositories).where(eq(repositories.id, finding.repoId)).limit(1);
      const repoRow = rows[0];
      if (repoRow && repoRow.orgId === actor.orgId) {
        [owner, repo] = repoRow.fullName.split("/");
        branch = repoRow.defaultBranch ?? "main";
        repoLink = repoRow.fullName;
      }
    }

    let files: Record<string, string> = {};
    if (owner && repo) {
      try {
        const source = await loadRepoSource({ owner, repo, branch, token: actor.githubToken });
        files = source.files;
      } catch {
        // Source unavailable → deterministic patches only.
      }
    }

    const findingShape = {
      ruleId: finding.ruleId ?? "unknown",
      title: finding.description,
      category: (finding.category as "sast" | "dependency" | "secret" | "config" | "authz") ?? "sast",
      severity: finding.severity === "informational" ? "low" : finding.severity,
      confidence: finding.confidence ?? 50,
      cwe: finding.cweId ?? undefined,
      cve: finding.cveId ?? undefined,
      filePath: finding.file ?? undefined,
      lineStart: finding.line ?? undefined,
      snippet: finding.snippet ?? undefined,
      rootCause: finding.rootCause ?? undefined,
      evidence: Array.isArray(finding.evidence) ? (finding.evidence as never) : undefined,
      impact: finding.impact ?? undefined,
    };

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "GENERATE_PATCH",
      action: "remediation_started",
      environment,
      input: JSON.stringify({ ruleId: finding.ruleId, repoLink }),
    });

    const remediation = await generateRemediation({
      finding: findingShape,
      files,
      investigation: finding.aiAnalysis
        ? { verdict: finding.verdict ?? "potential", analysis: finding.aiAnalysis }
        : undefined,
    });

    // Compute unified diffs server-side.
    const diffs: string[] = [];
    let added = 0;
    let removed = 0;
    for (const f of remediation.files) {
      const d = unifiedDiff(f.oldContent, f.newContent, f.path);
      if (d) {
        diffs.push(d);
        const stat = diffStat(d);
        added += stat.added;
        removed += stat.removed;
      }
    }
    const diff = diffs.join("\n\n");

    if (!diff) {
      return NextResponse.json(
        {
          error:
            "Could not generate a concrete patch for this finding. Review the recommended remediation and apply it manually, then run verification.",
          plan: {
            problem: remediation.problem,
            rootCause: remediation.rootCause,
            strategy: remediation.fixStrategy,
            verificationPlan: remediation.verificationPlan,
            explanation: remediation.explanation,
          },
        },
        { status: 422 }
      );
    }

    const [patch] = await db
      .insert(agentPatches)
      .values({
        findingId: finding.id,
        orgId: actor.orgId,
        status: "proposed",
        summary: redactSecrets(remediation.problem.slice(0, 600)),
        rootCause: redactSecrets(remediation.rootCause.slice(0, 800)),
        strategy: redactSecrets(remediation.fixStrategy.slice(0, 800)),
        diff: redactSecrets(diff.slice(0, 60_000)),
        verificationPlan: redactSecrets(remediation.verificationPlan.slice(0, 1200)),
      })
      .returning();

    await db
      .update(securityFindings)
      .set({ agentStatus: "remediation_ready" })
      .where(eq(securityFindings.id, finding.id));

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "GENERATE_PATCH",
      action: "remediation_completed",
      environment,
      result: JSON.stringify({ patchId: patch.id, added, removed }),
    });

    return NextResponse.json({
      patch: {
        id: patch.id,
        diff: patch.diff,
        summary: patch.summary,
        rootCause: patch.rootCause,
        strategy: patch.strategy,
        verificationPlan: patch.verificationPlan,
        added,
        removed,
      },
      explanation: remediation.explanation,
    });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return agentErrorResponse(err);
  }
}
