import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import { createSseStream } from "@/lib/server/sse";
import { rateLimit } from "@/lib/server/rate-limit";
import { createAppRun, listAppRuns } from "@/lib/server/app/data";
import { runFullQa, type AppEvent } from "@/lib/server/app/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const runs = await listAppRuns(id, 20);
    return jsonOk({ runs });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    await rateLimit({ key: `app-runs:${user.id}`, limit: 8, windowSec: 60 });

    return createSseStream(async (push) => {
      const runId = await createAppRun({ projectId, kind: "full", createdById: user.id });
      // Publish the run id first so the client can cancel this run.
      push({ type: "runId", runId });
      const emit = (e: AppEvent) => push({ ...e });
      try {
        await runFullQa({
          project: { id: projectId } as never,
          actor: { id: user.id, plan: user.plan },
          runId,
          emit,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        push({ type: "error", message: msg, code: "APP_QA_FAILED" });
        push({ type: "done" });
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}