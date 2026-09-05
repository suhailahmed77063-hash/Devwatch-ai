import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import {
  createSandbox,
  executeInSandbox,
  copyFilesToSandbox,
  readFilesFromSandbox,
  getSandboxStatus,
  destroySandbox,
  listSandboxes,
} from "@/lib/server/sandbox/manager";
import { readAppFiles } from "@/lib/server/app/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const executeSchema = z.object({
  command: z.string().min(1).max(1000),
  args: z.array(z.string()).optional(),
  timeoutMs: z.number().min(1000).max(300000).optional(),
});

/**
 * POST /api/projects/:id/sandbox
 * Create a sandbox and optionally execute a command
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      // Create sandbox and copy project files
      const sandbox = await createSandbox(projectId);
      const files = await readAppFiles(projectId);
      await copyFilesToSandbox(sandbox.id, files);

      return jsonOk({
        sandboxId: sandbox.id,
        cwd: sandbox.cwd,
        status: "ready",
        fileCount: Object.keys(files).length,
      });
    }

    if (action === "execute") {
      const parsed = executeSchema.parse(body);

      // Get or create sandbox
      const sandbox = await createSandbox(projectId);
      const files = await readAppFiles(projectId);
      await copyFilesToSandbox(sandbox.id, files);

      // Execute command
      const result = await executeInSandbox(
        sandbox.id,
        parsed.command,
        parsed.args ?? [],
        { timeoutMs: parsed.timeoutMs }
      );

      return jsonOk({
        sandboxId: sandbox.id,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        timedOut: result.timedOut,
        oomKilled: result.oomKilled,
        durationMs: result.durationMs,
      });
    }

    if (action === "status") {
      const sandboxId = body.sandboxId as string;
      const status = getSandboxStatus(sandboxId);
      return jsonOk({ status: status ?? { active: false } });
    }

    if (action === "destroy") {
      const sandboxId = body.sandboxId as string;
      await destroySandbox(sandboxId);
      return jsonOk({ destroyed: true });
    }

    if (action === "list") {
      const sandboxes = listSandboxes();
      return jsonOk({ sandboxes });
    }

    return jsonOk({ error: "Unknown action" });
  } catch (e) {
    return jsonError(e);
  }
}

/**
 * GET /api/projects/:id/sandbox
 * Get sandbox status for a project
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");

    const sandboxes = listSandboxes().filter(s => s.id.includes(id));
    return jsonOk({ sandboxes });
  } catch (e) {
    return jsonError(e);
  }
}
