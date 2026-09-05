import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonOk, jsonError } from "@/lib/server/http";
import { deployProject, rollbackDeployment, getDeploymentHistory, getDeploymentStats } from "@/lib/server/deploy/orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/projects/:id/deployments — list deployments with stats */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "VIEWER");

    const [deployments, stats] = await Promise.all([
      getDeploymentHistory(projectId),
      getDeploymentStats(projectId),
    ]);

    return jsonOk({ deployments, stats });
  } catch (e) {
    return jsonError(e);
  }
}

const deploySchema = z.object({
  action: z.literal("deploy").default("deploy"),
  message: z.string().max(120).optional(),
  skipHealthCheck: z.boolean().optional(),
});

const rollbackSchema = z.object({
  action: z.literal("rollback"),
  deploymentId: z.string(),
});

/** POST /api/projects/:id/deployments — deploy or rollback */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = await req.json();

    if (body.action === "rollback") {
      const parsed = rollbackSchema.parse(body);
      const result = await rollbackDeployment({
        projectId,
        deploymentId: parsed.deploymentId,
        actorId: user.id,
      });
      return jsonOk({ deployment: result });
    }

    // Default: deploy
    const parsed = deploySchema.parse(body);
    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

    const result = await deployProject({
      project,
      actor: { id: user.id, plan: user.plan },
      message: parsed.message ?? "Publish",
      skipHealthCheck: parsed.skipHealthCheck,
    });

    const deployment = await db.deployment.findUniqueOrThrow({
      where: { id: result.id },
      include: { logs: { orderBy: { createdAt: "asc" } } },
    });

    return jsonOk({ deployment, healthCheck: result.healthCheck });
  } catch (e) {
    return jsonError(e);
  }
}
