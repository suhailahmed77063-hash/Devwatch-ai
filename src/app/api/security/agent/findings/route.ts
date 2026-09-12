/**
 * GET /api/security/agent/findings — findings for the actor's organization.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityFindings } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getSecurityActor();
    const findings = await db
      .select()
      .from(securityFindings)
      .where(eq(securityFindings.orgId, actor.orgId))
      .orderBy(desc(securityFindings.createdAt))
      .limit(100);
    return NextResponse.json({ findings });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
