/**
 * GET /api/security/agent/web-audits — recent website audits for the org.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webAudits } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getSecurityActor();
    const audits = await db
      .select()
      .from(webAudits)
      .where(eq(webAudits.orgId, actor.orgId))
      .orderBy(desc(webAudits.createdAt))
      .limit(20);
    return NextResponse.json({ audits });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
