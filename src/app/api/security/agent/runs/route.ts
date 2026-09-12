/**
 * GET /api/security/agent/runs — agent runs for the actor's organization.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getSecurityActor();
    const runs = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.orgId, actor.orgId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(30);
    return NextResponse.json({ runs });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
