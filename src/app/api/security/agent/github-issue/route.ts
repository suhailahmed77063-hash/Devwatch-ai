/**
 * POST /api/security/agent/github-issue
 *
 * Create a GitHub issue from a finding (summary body + severity label).
 * Requires the project to have GitHub connected and a linked repo.
 */

import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { NotFoundError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { assertToolAllowed } from "@/lib/server/security/permissions";
import { createIssueForFinding } from "@/lib/server/security/github";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ findingId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await requireUserOrThrow();
    const db = requireDb();

    const finding = await db.securityFinding.findUnique({ where: { id: body.findingId } });
    if (!finding) throw new NotFoundError("Security finding");
    const { role } = await assertAccess(finding.projectId, user.id, "EDITOR");
    await rateLimit({ key: `security-issue:${user.id}`, limit: 10, windowSec: 60 });

    assertToolAllowed({ tool: "CREATE_GITHUB_ISSUE", role });

    const result = await createIssueForFinding({ finding, actorId: user.id });
    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
