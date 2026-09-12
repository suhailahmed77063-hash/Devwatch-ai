/**
 * POST /api/security/agent/investigate
 *
 * Starts a scan + AI investigation for a project (or explicit repo link) and
 * streams progress via SSE. Body: { repoLink?, maxInvestigations? }
 */

import { z } from "zod";
import { guardSecurityRoute } from "@/lib/server/security/routes";
import { jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { rateLimit } from "@/lib/server/rate-limit";
import { runScanAndInvestigate } from "@/lib/server/security/orchestrator";
import type { SecurityAgentEvent } from "@/lib/server/security/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  projectId: z.string().min(1),
  repoLink: z.string().max(300).optional(),
  maxInvestigations: z.number().int().min(0).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const { user, role, projectId } = await guardSecurityRoute(body.projectId, "EDITOR");
    await rateLimit({ key: `security-investigate:${user.id}`, limit: 5, windowSec: 60 });

    return createSseStream(async (push) => {
      const emit = (e: SecurityAgentEvent) => push(e);
      try {
        await runScanAndInvestigate({
          projectId,
          actor: { id: user.id, role },
          repoLink: body.repoLink ?? null,
          maxInvestigations: body.maxInvestigations,
          emit,
        });
      } finally {
        emit({ type: "done" });
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}
