import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import { readAppFiles, listEnvVars, listAppRuns } from "@/lib/server/app/data";
import { runSecurityScan } from "@/lib/server/app/security";
import { computeReadiness } from "@/lib/server/app/review";
import { gitLog } from "@/lib/server/app/workspace";
import { workspaceDir } from "@/lib/server/app/templates";
import type { PipelineResult, PipelineStep } from "@/types/app";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");

    const [files, envVars, runs] = await Promise.all([readAppFiles(id), listEnvVars(id), listAppRuns(id, 1)]);
    const lastRunRow = runs[0] ?? null;
    const lastRun: PipelineResult | null = lastRunRow
      ? {
          steps: (lastRunRow.steps as PipelineStep[] | null) ?? [],
          passed: lastRunRow.status === "PASSED",
          durationMs: lastRunRow.durationMs ?? 0,
        }
      : null;

    const security = runSecurityScan(files);
    const readiness = computeReadiness({
      files,
      envVars: envVars.map((v) => ({ name: v.name, isSecret: v.isSecret })),
      lastRun,
      hasDatabase: false,
    });
    const commits = await gitLog(workspaceDir(id), 10).catch(() => []);

    return jsonOk({
      security: { score: security.score, findings: security.findings.slice(0, 50) },
      readiness,
      lastRun,
      git: { log: commits, configured: commits.length > 0 },
    });
  } catch (e) {
    return jsonError(e);
  }
}