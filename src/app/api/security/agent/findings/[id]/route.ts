/**
 * GET /api/security/agent/findings/:id — full finding detail for the
 * dashboard detail view: finding + validations + patches + verifications +
 * audit trail (agent_actions), all organization-isolated.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentValidations, agentPatches, agentVerifications, agentActions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSecurityActor, loadFindingForActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getSecurityActor();
    const { id } = await ctx.params;
    const finding = await loadFindingForActor(id, actor);

    const [validations, patches, verifications, actions] = await Promise.all([
      db.select().from(agentValidations).where(eq(agentValidations.findingId, id)).orderBy(desc(agentValidations.startedAt)).limit(10),
      db.select().from(agentPatches).where(eq(agentPatches.findingId, id)).orderBy(desc(agentPatches.createdAt)).limit(10),
      db.select().from(agentVerifications).where(eq(agentVerifications.findingId, id)).orderBy(desc(agentVerifications.startedAt)).limit(10),
      db.select().from(agentActions).where(eq(agentActions.findingId, id)).orderBy(desc(agentActions.createdAt)).limit(50),
    ]);

    return NextResponse.json({ finding, validations, patches, verifications, actions });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
