/**
 * Legacy deploy runner — now delegates to the orchestrator.
 * Kept for backward compatibility with existing imports.
 */

import type { DeploymentStatus, Project, User } from "@prisma/client";
import { requireDb } from "../db";
import { logger } from "../logger";
import { deployProject } from "./orchestrator";

export interface DeployInput {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  message?: string;
}

/**
 * Execute a deployment. Delegates to the orchestrator with health check enabled.
 */
export async function runDeployment(input: DeployInput): Promise<{ id: string; url: string | null; status: DeploymentStatus }> {
  try {
    const result = await deployProject({
      project: input.project,
      actor: input.actor,
      message: input.message,
    });
    return result;
  } catch (e) {
    logger.error("deploy.run_failed", { projectId: input.project.id, error: (e as Error).message });
    return { id: "", url: null, status: "FAILED" };
  }
}
