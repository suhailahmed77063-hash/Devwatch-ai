/**
 * GET /api/security/agent/dashboard — everything the /security/agent page
 * needs in one call: overview counts, open findings, recent runs and agent
 * activity — all scoped to the actor's organization.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityFindings, agentRuns, agentActions } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getSecurityActor();

    const severityCounts = await db
      .select({ severity: securityFindings.severity, count: sql<number>`count(*)::int` })
      .from(securityFindings)
      .where(eq(securityFindings.orgId, actor.orgId))
      .groupBy(securityFindings.severity);

    const verdictCounts = await db
      .select({ verdict: securityFindings.verdict, count: sql<number>`count(*)::int` })
      .from(securityFindings)
      .where(eq(securityFindings.orgId, actor.orgId))
      .groupBy(securityFindings.verdict);

    const statusCounts = await db
      .select({ status: securityFindings.agentStatus, count: sql<number>`count(*)::int` })
      .from(securityFindings)
      .where(eq(securityFindings.orgId, actor.orgId))
      .groupBy(securityFindings.agentStatus);

    const [openFindings, runs, activity] = await Promise.all([
      db
        .select()
        .from(securityFindings)
        .where(eq(securityFindings.orgId, actor.orgId))
        .orderBy(desc(securityFindings.createdAt))
        .limit(50),
      db.select().from(agentRuns).where(eq(agentRuns.orgId, actor.orgId)).orderBy(desc(agentRuns.startedAt)).limit(10),
      db
        .select({
          id: agentActions.id,
          tool: agentActions.tool,
          action: agentActions.action,
          status: agentActions.status,
          findingId: agentActions.findingId,
          environment: agentActions.environment,
          createdAt: agentActions.createdAt,
        })
        .from(agentActions)
        .where(eq(agentActions.orgId, actor.orgId))
        .orderBy(desc(agentActions.createdAt))
        .limit(25),
    ]);

    const bySeverity = Object.fromEntries(severityCounts.map((r) => [r.severity, r.count]));
    const byVerdict = Object.fromEntries(verdictCounts.map((r) => [r.verdict ?? "unassessed", r.count]));
    const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status ?? "none", r.count]));

    const fixed = openFindings.filter((f) => ["verified", "fixed"].includes(f.agentStatus ?? "")).length;

    return NextResponse.json({
      overview: {
        total: openFindings.length,
        critical: bySeverity["critical"] ?? 0,
        high: bySeverity["high"] ?? 0,
        medium: bySeverity["medium"] ?? 0,
        low: bySeverity["low"] ?? 0,
        confirmedExploitable: byVerdict["confirmed"] ?? 0,
        potential: (byVerdict["potential"] ?? 0) + (byVerdict["likely"] ?? 0),
        falsePositives: byVerdict["false_positive"] ?? 0,
        fixed,
        pendingVerification: byStatus["validation_required"] ?? 0,
      },
      findings: openFindings,
      runs,
      activity,
      actor: { name: actor.name, orgName: actor.orgName, role: actor.role },
    });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
