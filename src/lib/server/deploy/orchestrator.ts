/**
 * Deployment Orchestrator — enhanced deployment pipeline with:
 * - Multi-step build process with real logs
 * - Health check verification after deploy
 * - Rollback to previous deployments
 * - Real-time status tracking
 * - Custom domain support
 */

import type { Deployment, DeploymentStatus, Project, User } from "@prisma/client";
import { ConfigError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireDb } from "../db";
import { logger } from "../logger";
import { logAudit } from "../audit";
import { buildExportFiles } from "@/lib/codegen/static";
import { getDeploymentProvider } from "@/providers/deployment";
import { normalizeWebsite } from "@/lib/website/schema";
import { recordUsage } from "../usage";

export interface DeployOptions {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  message?: string;
  /** Skip health check (useful for initial deploy) */
  skipHealthCheck?: boolean;
}

export interface RollbackOptions {
  projectId: string;
  deploymentId: string;
  actorId: string;
}

// ── Helper functions ──────────────────────────────────────────────────────────

async function createDeployment(db: any, projectId: string, provider: string, message: string) {
  return db.deployment.create({
    data: { projectId, status: "QUEUED", provider, commitLabel: message.slice(0, 80) },
  });
}

async function updateStatus(db: any, deploymentId: string, status: DeploymentStatus, extra?: Record<string, any>) {
  return db.deployment.update({ where: { id: deploymentId }, data: { status, ...extra } });
}

async function addLog(db: any, deploymentId: string, level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  return db.deploymentLog.create({
    data: { deploymentId, level, message, meta: meta as any },
  });
}

// ── Health Check ──────────────────────────────────────────────────────────────

async function verifyHealthCheck(url: string, maxRetries = 5, delayMs = 2000): Promise<{ ok: boolean; status?: number; latencyMs?: number; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "AIForge-Deploy-Verifier/1.0" },
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, status: res.status, latencyMs };
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      return { ok: false, status: res.status, latencyMs, error: `HTTP ${res.status}` };
    } catch (e) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return { ok: false, error: (e as Error).message };
    }
  }
  return { ok: false, error: "Max retries exceeded" };
}

// ── Main Deploy ───────────────────────────────────────────────────────────────

export async function deployProject(options: DeployOptions): Promise<{
  id: string;
  url: string | null;
  status: DeploymentStatus;
  healthCheck?: { ok: boolean; status?: number; latencyMs?: number };
}> {
  const db = requireDb();
  const started = Date.now();
  const provider = getDeploymentProvider();

  const deployment = await createDeployment(db, options.project.id, provider.id, options.message ?? "Deploy");

  const fail = async (message: string, e?: unknown) => {
    await addLog(db, deployment.id, "error", message, { error: e instanceof Error ? e.message : String(e) });
    await updateStatus(db, deployment.id, "FAILED", { error: message.slice(0, 400), durationMs: Date.now() - started });
    await logAudit({
      actorId: options.actor.id, projectId: options.project.id,
      action: "deployment.failed", entity: "Deployment", entityId: deployment.id,
      meta: { error: message.slice(0, 200) },
    });
  };

  try {
    // Step 1: Validate schema
    await addLog(db, deployment.id, "info", "Step 1/5: Validating project schema...");
    const raw = options.project.currentSchema;
    if (!raw) throw new ValidationError("No content to deploy. Generate or edit a site first.");
    const doc = normalizeWebsite(raw);
    await addLog(db, deployment.id, "info", `Schema valid — ${doc.pages.length} page(s), "${doc.metadata.name}"`);

    // Step 2: Build static artifact
    await updateStatus(db, deployment.id, "BUILDING");
    await addLog(db, deployment.id, "info", "Step 2/5: Building static artifact...");
    const files = buildExportFiles(doc);
    const htmlCount = Object.values(files).filter(f => f.includes("<!doctype html>")).length;
    const totalSize = Object.values(files).reduce((a, c) => a + Buffer.byteLength(c), 0);
    await addLog(db, deployment.id, "info", `Artifact built — ${htmlCount} HTML file(s), ${(totalSize / 1024).toFixed(1)} KB total`);

    // Step 3: Deploy to provider
    await updateStatus(db, deployment.id, "DEPLOYING");
    await addLog(db, deployment.id, "info", `Step 3/5: Deploying to ${provider.id}...`);
    const { url } = await provider.deploy({
      projectId: options.project.id,
      deploymentId: deployment.id,
      slug: options.project.slug,
      files,
    });
    await addLog(db, deployment.id, "info", `Deployed to ${url}`);

    // Step 4: Health check
    let healthCheck: { ok: boolean; status?: number; latencyMs?: number; error?: string } | undefined;
    if (!options.skipHealthCheck) {
      await addLog(db, deployment.id, "info", "Step 4/5: Running health check...");
      healthCheck = await verifyHealthCheck(url);
      if (healthCheck.ok) {
        await addLog(db, deployment.id, "info", `Health check passed — HTTP ${healthCheck.status}, ${healthCheck.latencyMs}ms`);
      } else {
        await addLog(db, deployment.id, "warn", `Health check failed — ${healthCheck.error ?? 'Unknown error'}. Site may still be propagating.`);
      }
    } else {
      await addLog(db, deployment.id, "info", "Step 4/5: Health check skipped");
    }

    // Step 5: Finalize
    const currentVersion = await db.projectVersion.findFirst({
      where: { projectId: options.project.id },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });

    const durationMs = Date.now() - started;
    await db.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "READY", url, isPublished: true, durationMs,
        version: currentVersion?.version ?? null,
      },
    });
    await addLog(db, deployment.id, "info", `Step 5/5: Deployment complete in ${(durationMs / 1000).toFixed(1)}s`);

    await recordUsage({ userId: options.actor.id, kind: "DEPLOYMENT", meta: { deploymentId: deployment.id } });
    await logAudit({
      actorId: options.actor.id, projectId: options.project.id,
      action: "deployment.success", entity: "Deployment", entityId: deployment.id,
      meta: { url, durationMs, healthCheck: healthCheck?.ok },
    });

    return { id: deployment.id, url, status: "READY", healthCheck };
  } catch (e) {
    logger.error("deploy.orchestrator.failed", { deploymentId: deployment.id, error: (e as Error).message });
    if (e instanceof NotFoundError || e instanceof ValidationError || e instanceof ConfigError) {
      await fail(e.publicMessage);
    } else {
      await fail("Deployment failed during the build step.", e);
    }
    return { id: deployment.id, url: null, status: "FAILED" };
  }
}

// ── Rollback ──────────────────────────────────────────────────────────────────

export async function rollbackDeployment(options: RollbackOptions): Promise<{
  id: string;
  url: string | null;
  status: DeploymentStatus;
}> {
  const db = requireDb();

  // Find the deployment to rollback to
  const targetDeployment = await db.deployment.findUnique({
    where: { id: options.deploymentId },
    select: { id: true, projectId: true, status: true, artifact: true, url: true },
  });

  if (!targetDeployment) throw new NotFoundError("Deployment");
  if (targetDeployment.projectId !== options.projectId) throw new ValidationError("Deployment does not belong to this project");
  if (targetDeployment.status !== "READY") throw new ValidationError("Can only rollback to a successful deployment");

  const project = await db.project.findUniqueOrThrow({ where: { id: options.projectId } });
  const started = Date.now();

  // Create a new deployment with the same artifact
  const newDeployment = await db.deployment.create({
    data: {
      projectId: options.projectId,
      status: "QUEUED",
      provider: "webforge-rollback",
      commitLabel: `Rollback to deployment ${options.deploymentId.slice(0, 8)}`,
    },
  });

  try {
    await addLog(db, newDeployment.id, "info", `Rolling back to deployment ${options.deploymentId.slice(0, 8)}...`);

    // Restore the artifact
    if (targetDeployment.artifact) {
      await addLog(db, newDeployment.id, "info", "Restoring artifact from previous deployment...");
      const provider = getDeploymentProvider();
      const { url } = await provider.deploy({
        projectId: options.projectId,
        deploymentId: newDeployment.id,
        slug: project.slug,
        files: targetDeployment.artifact as Record<string, string>,
      });

      const durationMs = Date.now() - started;
      await db.deployment.update({
        where: { id: newDeployment.id },
        data: { status: "READY", url, isPublished: true, durationMs },
      });

      await addLog(db, newDeployment.id, "info", `Rollback complete — live at ${url}`);

      await logAudit({
        actorId: options.actorId, projectId: options.projectId,
        action: "deployment.rollback", entity: "Deployment", entityId: newDeployment.id,
        meta: { targetDeploymentId: options.deploymentId, url, durationMs },
      });

      return { id: newDeployment.id, url, status: "READY" };
    }

    throw new ValidationError("Target deployment has no artifact to restore");
  } catch (e) {
    logger.error("deploy.rollback.failed", { deploymentId: newDeployment.id, error: (e as Error).message });
    await addLog(db, newDeployment.id, "error", (e as Error).message);
    await updateStatus(db, newDeployment.id, "FAILED", { error: (e as Error).message, durationMs: Date.now() - started });
    throw e;
  }
}

// ── Deployment History ────────────────────────────────────────────────────────

export async function getDeploymentHistory(projectId: string, limit = 20) {
  const db = requireDb();
  return db.deployment.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, status: true, url: true, provider: true, commitLabel: true,
      durationMs: true, isPublished: true, createdAt: true, error: true,
    },
  });
}

// ── Deployment Stats ──────────────────────────────────────────────────────────

export async function getDeploymentStats(projectId: string) {
  const db = requireDb();
  const [total, successful, failed, lastDeploy] = await Promise.all([
    db.deployment.count({ where: { projectId } }),
    db.deployment.count({ where: { projectId, status: "READY" } }),
    db.deployment.count({ where: { projectId, status: "FAILED" } }),
    db.deployment.findFirst({
      where: { projectId, status: "READY" },
      orderBy: { createdAt: "desc" },
      select: { url: true, createdAt: true, durationMs: true },
    }),
  ]);

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    lastDeploy,
  };
}
