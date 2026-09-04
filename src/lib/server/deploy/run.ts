import type { DeploymentLog, Project, DeploymentStatus, Prisma, User } from "@prisma/client";
import { ConfigError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireDb } from "../db";
import { logger } from "../logger";
import { recordUsage } from "../usage";
import { buildExportFiles } from "@/lib/codegen/static";
import { getDeploymentProvider, type DeploymentProvider } from "@/providers/deployment";
import { normalizeWebsite } from "@/lib/website/schema";
import { logAudit } from "../audit";

export interface DeployInput {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  message?: string;
}

async function setStatus(
  deploymentId: string,
  status: DeploymentStatus,
  extra?: { url?: string; error?: string; durationMs?: number }
) {
  const db = requireDb();
  await db.deployment.update({ where: { id: deploymentId }, data: { status, ...extra } });
}

async function addLog(deploymentId: string, level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): Promise<DeploymentLog> {
  const db = requireDb();
  return db.deploymentLog.create({ data: { deploymentId, level, message, meta: meta as Prisma.InputJsonValue | undefined } });
}

/**
 * Executes a deployment from QUEUED → READY/FAILED with real build steps and
 * real logs. Never simulates progress — each transition is a real action.
 */
export async function runDeployment(input: DeployInput): Promise<{ id: string; url: string | null; status: DeploymentStatus }> {
  const db = requireDb();
  const started = Date.now();

  const deployment = await db.deployment.create({
    data: {
      projectId: input.project.id,
      status: "QUEUED",
      provider: (getDeploymentProvider() as DeploymentProvider).id,
      commitLabel: input.message?.slice(0, 80) ?? "Manual publish",
    },
  });

  const fail = async (message: string, e?: unknown) => {
    await addLog(deployment.id, "error", message, { error: e instanceof Error ? e.message : String(e) });
    await setStatus(deployment.id, "FAILED", { error: message.slice(0, 400), durationMs: Date.now() - started });
    await logAudit({
      actorId: input.actor.id,
      projectId: input.project.id,
      action: "deployment.failed",
      entity: "Deployment",
      entityId: deployment.id,
      meta: { error: message.slice(0, 200) },
    });
  };

  try {
    // 1. validate the current schema
    await addLog(deployment.id, "info", "Validating project schema…");
    const raw = input.project.currentSchema;
    if (!raw) throw new ValidationError("This project has no content to deploy yet. Generate or edit a site first.");
    const doc = normalizeWebsite(raw);
    const pages = doc.pages.length;
    await addLog(deployment.id, "info", `Schema OK — ${pages} page${pages === 1 ? "" : "s"} (${doc.metadata.name})`);
    await setStatus(deployment.id, "BUILDING");

    // 2. build the static artifact (deterministic, real)
    await addLog(deployment.id, "info", "Building static artifact…");
    const files = buildExportFiles(doc);
    const htmlCount = Object.values(files).filter((f) => f.includes("<!doctype html>")).length;
    await addLog(deployment.id, "info", `Artifact built — ${htmlCount} HTML file${htmlCount === 1 ? "" : "s"}, ${Object.keys(files).length} files total`);

    // 3. deploy via the configured provider
    await setStatus(deployment.id, "DEPLOYING");
    await addLog(deployment.id, "info", `Deploying to ${(getDeploymentProvider() as DeploymentProvider).id}…`);
    const provider = getDeploymentProvider();
    const { url } = await provider.deploy({
      projectId: input.project.id,
      deploymentId: deployment.id,
      slug: input.project.slug,
      files,
    });

    // 4. record the current version for the deployment history
    const current = await db.projectVersion.findFirst({
      where: { projectId: input.project.id },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });

    const durationMs = Date.now() - started;
    await db.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "READY",
        url,
        isPublished: true,
        durationMs,
        version: current?.version ?? null,
      },
    });
    await addLog(deployment.id, "info", `Deployed successfully in ${(durationMs / 1000).toFixed(1)}s — ${url}`);
    await recordUsage({ userId: input.actor.id, kind: "DEPLOYMENT", meta: { deploymentId: deployment.id } });
    await logAudit({
      actorId: input.actor.id,
      projectId: input.project.id,
      action: "deployment.success",
      entity: "Deployment",
      entityId: deployment.id,
      meta: { url, durationMs },
    });
    return { id: deployment.id, url, status: "READY" };
  } catch (e) {
    logger.error("deployment.run_failed", { deploymentId: deployment.id, error: e instanceof Error ? e.message : String(e) });
    if (e instanceof NotFoundError || e instanceof ValidationError) {
      await fail(e.publicMessage);
    } else if (e instanceof ConfigError) {
      await fail(e.publicMessage);
    } else {
      await fail("Deployment failed during the build step.", e);
    }
    return { id: deployment.id, url: null, status: "FAILED" };
  }
}
