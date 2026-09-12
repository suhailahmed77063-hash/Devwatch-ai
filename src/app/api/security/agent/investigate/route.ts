/**
 * POST /api/security/agent/investigate
 *
 * Starts a Security Agent run: Detect → Investigate over a repository
 * (repo link or linked repository). Streams progress events over SSE.
 * Organization isolation via the authenticated actor.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSecurityActor } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { parseRepoLink } from "@/lib/security-agent/source";
import {
  upsertRepoForLink,
  createAgentRun,
  runInvestigationPipeline,
  finishRun,
} from "@/lib/security-agent/orchestrator";
import { db } from "@/lib/db";
import { agentRuns, repositories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const maxDuration = 300;

const bodySchema = z.object({
  repoLink: z.string().min(1).optional(),
  repoId: z.string().uuid().optional(),
  branch: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor = await getSecurityActor();
  } catch (err) {
    return agentErrorResponse(err);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Provide either repoLink (github.com/owner/repo) or repoId" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let owner: string;
        let repo: string;
        let branch = body.branch;
        let repoId: string;
        let repoLink: string | null = null;

        if (body.repoId) {
          const rows = await db
            .select()
            .from(repositories)
            .where(and(eq(repositories.id, body.repoId), eq(repositories.orgId, actor.orgId)))
            .limit(1);
          const repoRow = rows[0];
          if (!repoRow) throw new Error("Repository not found in this organization");
          [owner, repo] = repoRow.fullName.split("/");
          branch = branch ?? repoRow.defaultBranch ?? undefined;
          repoId = repoRow.id;
          repoLink = repoRow.fullName;
        } else if (body.repoLink) {
          const parsed = parseRepoLink(body.repoLink);
          if (!parsed) throw new Error("Invalid GitHub repository link");
          owner = parsed.owner;
          repo = parsed.repo;
          branch = branch ?? parsed.branch;
          repoLink = `${owner}/${repo}`;
          const upserted = await upsertRepoForLink({
            orgId: actor.orgId,
            owner,
            repo,
            branch,
            userId: actor.userId,
          });
          repoId = upserted.repoId;
        } else {
          throw new Error("Provide either repoLink or repoId");
        }

        const run = await createAgentRun({
          orgId: actor.orgId,
          repoId,
          repoLink,
          branch,
          kind: "full",
          userId: actor.userId,
        });
        send({ type: "stage", label: `Security agent started — ${repoLink ?? repoId}`, runId: run.id });

        const result = await runInvestigationPipeline({
          run,
          owner,
          repo,
          branch,
          token: actor.githubToken,
          actor: { userId: actor.userId },
          onEvent: (event) => send(event),
        });

        send({
          type: "reply",
          text: `Run completed: ${result.findingCount} finding(s) across ${result.fileCount} files. Open /security/agent to review.`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Investigation failed";
        // Ensure the run row is marked failed even on early errors.
        try {
          const latest = await db
            .select()
            .from(agentRuns)
            .where(eq(agentRuns.orgId, actor.orgId))
            .orderBy(agentRuns.startedAt)
            .limit(1);
          if (latest[0]?.status === "running") {
            await finishRun({ run: latest[0], status: "failed", error: message });
          }
        } catch {
          // ignore secondary failure
        }
        send({ type: "error", message, code: "investigate_failed" });
      } finally {
        controller.enqueue(encoder.encode("data: {\"type\":\"done\"}\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
