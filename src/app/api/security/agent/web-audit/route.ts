/**
 * POST /api/security/agent/web-audit — run an end-to-end audit of a website
 * URL (read-only checks, SSRF-guarded) and persist the final report.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { webAudits, webFindings, agentActions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { runWebAudit } from "@/lib/security-agent/web-audit";

export const maxDuration = 120;

const bodySchema = z.object({
  url: z.string().min(4).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getSecurityActor();
    const body = bodySchema.parse(await request.json());

    const [audit] = await db
      .insert(webAudits)
      .values({
        orgId: actor.orgId,
        url: body.url,
        status: "running",
        createdById: actor.userId,
      })
      .returning();

    const started = Date.now();
    try {
      const result = await runWebAudit(body.url);
      const issues = result.findings.filter((f) => f.severity !== "info");

      if (result.findings.length > 0) {
        await db.insert(webFindings).values(
          result.findings.map((f) => ({
            auditId: audit.id,
            orgId: actor.orgId,
            category: f.category,
            severity: f.severity,
            checkId: f.checkId,
            title: f.title,
            detail: f.detail ?? null,
            evidence: f.evidence ?? null,
            recommendation: f.recommendation ?? null,
          }))
        );
      }

      await db
        .update(webAudits)
        .set({
          status: "completed",
          score: result.score,
          summary: result.summary,
          durationMs: Date.now() - started,
          finishedAt: new Date(),
        })
        .where(eq(webAudits.id, audit.id));

      await db.insert(agentActions).values({
        orgId: actor.orgId,
        actorId: actor.userId,
        tool: "RUN_WEB_AUDIT",
        action: "web_audit_completed",
        environment: "server",
        input: JSON.stringify({ url: body.url }),
        result: JSON.stringify({ score: result.score, issues: issues.length }),
        durationMs: Date.now() - started,
      });

      return NextResponse.json({
        audit: {
          id: audit.id,
          url: result.url,
          finalUrl: result.finalUrl,
          status: "completed",
          score: result.score,
          summary: result.summary,
        },
        findings: result.findings,
        timings: result.timings,
        pageMeta: result.pageMeta,
        checkedPaths: result.checkedPaths,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audit failed";
      await db
        .update(webAudits)
        .set({ status: "failed", error: message, durationMs: Date.now() - started, finishedAt: new Date() })
        .where(eq(webAudits.id, audit.id));
      return NextResponse.json({ error: `Audit failed: ${message}` }, { status: 502 });
    }
  } catch (err) {
    return agentErrorResponse(err);
  }
}
