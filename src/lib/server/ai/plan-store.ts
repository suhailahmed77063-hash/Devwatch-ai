/**
 * Plan Store — lightweight file-based storage for pending AI plans.
 *
 * When the AI agent generates a plan, it's stored here until the user
 * approves or rejects it. This avoids DB schema changes and works
 * reliably on Vercel serverless.
 */

import fs from "node:fs";
import path from "node:path";
import { workspaceDir } from "../app/templates";
import { logger } from "../logger";

export interface PendingPlan {
  id: string;
  projectId: string;
  steps: string[];
  operations: { kind: string; path: string; content?: string; newPath?: string }[];
  summary: string;
  runTests: boolean;
  message: string;
  createdAt: string;
  expiresAt: string;
}

const PLAN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function planDir(projectId: string): string {
  const dir = path.join(workspaceDir(projectId), ".aiforge");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function planPath(projectId: string, planId: string): string {
  return path.join(planDir(projectId), `${planId}.json`);
}

/** Store a pending plan. Returns the plan ID. */
export function storePendingPlan(plan: Omit<PendingPlan, "id" | "createdAt" | "expiresAt">): string {
  const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const full: PendingPlan = {
    ...plan,
    id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PLAN_TTL_MS).toISOString(),
  };

  try {
    fs.writeFileSync(planPath(plan.projectId, id), JSON.stringify(full, null, 2), "utf8");
    return id;
  } catch (e) {
    logger.warn("plan_store.write_failed", { projectId: plan.projectId, error: (e as Error).message });
    return id;
  }
}

/** Retrieve and delete a pending plan. Returns null if not found or expired. */
export function consumePendingPlan(projectId: string, planId: string): PendingPlan | null {
  const fp = planPath(projectId, planId);
  try {
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    const plan: PendingPlan = JSON.parse(raw);

    // Check expiry
    if (new Date(plan.expiresAt) < new Date()) {
      fs.rmSync(fp, { force: true });
      return null;
    }

    // Delete after reading (one-time use)
    fs.rmSync(fp, { force: true });
    return plan;
  } catch (e) {
    logger.warn("plan_store.read_failed", { projectId, planId, error: (e as Error).message });
    return null;
  }
}

/** Peek at a pending plan without consuming it. */
export function peekPendingPlan(projectId: string, planId: string): PendingPlan | null {
  const fp = planPath(projectId, planId);
  try {
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    const plan: PendingPlan = JSON.parse(raw);
    if (new Date(plan.expiresAt) < new Date()) {
      fs.rmSync(fp, { force: true });
      return null;
    }
    return plan;
  } catch {
    return null;
  }
}

/** Delete a pending plan (reject). */
export function deletePendingPlan(projectId: string, planId: string): void {
  try {
    fs.rmSync(planPath(projectId, planId), { force: true });
  } catch {
    // ignore
  }
}

/** Cleanup expired plans in a project. */
export function cleanupExpiredPlans(projectId: string): number {
  const dir = planDir(projectId);
  let cleaned = 0;
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith("plan_") && f.endsWith(".json"));
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, f), "utf8");
        const plan: PendingPlan = JSON.parse(raw);
        if (new Date(plan.expiresAt) < new Date()) {
          fs.rmSync(path.join(dir, f), { force: true });
          cleaned++;
        }
      } catch {
        // skip malformed files
      }
    }
  } catch {
    // ignore
  }
  return cleaned;
}
