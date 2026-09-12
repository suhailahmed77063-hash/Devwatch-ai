/**
 * GET /api/security/agent/web-audit/:id/report — download the final report
 * (markdown) for a completed web audit. Organization-isolated.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webAudits, webFindings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { buildReportMarkdown, type WebAuditResult, type WebFinding } from "@/lib/security-agent/web-audit";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getSecurityActor();
    const { id } = await ctx.params;

    const audits = await db
      .select()
      .from(webAudits)
      .where(and(eq(webAudits.id, id), eq(webAudits.orgId, actor.orgId)))
      .limit(1);
    const audit = audits[0];
    if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

    const rows = await db.select().from(webFindings).where(eq(webFindings.auditId, id));
    const findings: WebFinding[] = rows.map((r) => ({
      category: r.category as WebFinding["category"],
      severity: r.severity as WebFinding["severity"],
      checkId: r.checkId,
      title: r.title,
      detail: r.detail ?? undefined,
      evidence: r.evidence ?? undefined,
      recommendation: r.recommendation ?? undefined,
    }));

    const validations = (audit.validations as WebAuditResult["validations"]) ?? [];
    const fixPlan = (audit.fixPlan as WebAuditResult["fixPlan"]) ?? [];
    const score = audit.score ?? 0;
    const pseudo: WebAuditResult = {
      url: audit.url,
      finalUrl: audit.url,
      reachable: audit.status !== "failed",
      https: audit.url.startsWith("https://"),
      findings,
      validations,
      fixPlan,
      score,
      summary: audit.summary ?? "",
      timings: { totalMs: audit.durationMs ?? 0, ttfbMs: null, loadMs: null },
      pageMeta: { h1Count: 0, imgWithoutAlt: 0, htmlBytes: 0 },
      checkedPaths: [],
    };

    const markdown = buildReportMarkdown(pseudo);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="devwatch-web-audit-${id.slice(0, 8)}.md"`,
      },
    });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
