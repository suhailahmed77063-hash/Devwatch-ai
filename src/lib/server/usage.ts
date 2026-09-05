import type { Plan, Prisma, UsageKind, User } from "@prisma/client";
import { requireDb } from "./db";
import { PLANS } from "@/lib/constants";
import { UsageLimitError, UpgradeRequiredError } from "@/lib/errors";
import { logger } from "./logger";

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function recordUsage(input: {
  userId: string;
  kind: UsageKind;
  amount?: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const db = requireDb();
  const month = monthKey();
  const existing = await db.usage.findUnique({
    where: { userId_kind_month: { userId: input.userId, kind: input.kind, month } },
  });
  if (existing) {
    await db.usage.update({
      where: { id: existing.id },
      data: { used: { increment: input.amount ?? 1 }, meta: input.meta as Prisma.InputJsonValue | undefined },
    });
  } else {
    await db.usage.create({
      data: { userId: input.userId, kind: input.kind, month, used: input.amount ?? 1, meta: input.meta as Prisma.InputJsonValue | undefined },
    });
  }
}

export async function usageOf(userId: string, month = monthKey()): Promise<Record<UsageKind, number>> {
  const db = requireDb();
  const rows = await db.usage.findMany({ where: { userId, month } });
  const out = {} as Record<UsageKind, number>;
  for (const r of rows) out[r.kind] = r.used;
  return out;
}

export interface LimitContext {
  user: Pick<User, "id" | "plan">;
  projectId?: string;
}

/**
 * Enforce plan limits server-side. Free users get AI_GENERATION metered
 * monthly; published deployments count distinct published projects.
 */
export async function assertPlanAllowed(kind: UsageKind, ctx: LimitContext): Promise<void> {
  const plan = ctx.user.plan;
  const limits = PLANS[plan];

  if (kind === "AI_GENERATION") {
    const n = limits.aiGenerationsPerMonth;
    if (n === 0) throw new UpgradeRequiredError("AI generation is a Pro feature. Upgrade to unlock unlimited AI generations.");
    // -1 means unlimited, no check needed
    if (n > 0) {
      const used = (await usageOf(ctx.user.id))[kind] ?? 0;
      if (used >= n) throw new UsageLimitError();
    }
    return;
  }

  if (kind === "APP_GENERATION") {
    const n = limits.appGenerationsPerMonth;
    if (n === 0) throw new UpgradeRequiredError("AI app builder is a Pro feature. Upgrade to unlock app generation.");
    // -1 means unlimited, no check needed
    if (n > 0) {
      const used = (await usageOf(ctx.user.id))["APP_GENERATION"] ?? 0;
      if (used >= n) throw new UsageLimitError();
    }
    return;
  }

  if (kind === "IMAGE_GENERATION") {
    if (!limits.aiImages) throw new UpgradeRequiredError("AI image generation is a Pro feature. Upgrade to generate images with AI.");
    return;
  }

  if (kind === "CODE_EXPORT") {
    if (!limits.codeExport) throw new UpgradeRequiredError("Code export is a Pro feature. Upgrade to download your project code.");
    return;
  }

  if (kind === "DEPLOYMENT") {
    const published = limits.publishedProjects;
    if (published === 0) throw new UpgradeRequiredError("Publishing is a Pro feature.");
    // -1 means unlimited, no check needed
    if (published > 0 && ctx.projectId) {
      const db = requireDb();
      const deployments = await db.deployment.findMany({
        where: { status: "READY", isPublished: true, project: { ownerId: ctx.user.id } },
        select: { projectId: true },
      });
      const distinct = new Set(deployments.map((d) => d.projectId));
      const willCount = ctx.projectId && !distinct.has(ctx.projectId) ? 1 : 0;
      if (distinct.size + willCount > published) {
        throw new UsageLimitError();
      }
    }
    return;
  }

  logger.debug("usage.plan_check_skipped", { kind });
}

export interface DashboardUsage {
  month: string;
  byKind: Record<string, number>;
  aiGenerations: { used: number; limit: number; unlimited: boolean };
  appGenerations: { used: number; limit: number; unlimited: boolean };
  published: { used: number; limit: number; unlimited: boolean };
}

export async function getDashboardUsage(userId: string): Promise<DashboardUsage> {
  const db = requireDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const byKind = await usageOf(userId);
  const deployments = await db.deployment.findMany({
    where: { status: "READY", isPublished: true, project: { ownerId: userId } },
    select: { projectId: true },
  });
  const publishedCount = new Set(deployments.map((d) => d.projectId)).size;
  const genLimit = PLANS[user.plan].aiGenerationsPerMonth;
  const appLimit = PLANS[user.plan].appGenerationsPerMonth;
  const pubLimit = PLANS[user.plan].publishedProjects;
  return {
    month: monthKey(),
    byKind,
    aiGenerations: {
      used: byKind.AI_GENERATION ?? 0,
      limit: genLimit === -1 ? 0 : genLimit,
      unlimited: genLimit === -1,
    },
    appGenerations: {
      used: byKind.APP_GENERATION ?? 0,
      limit: appLimit === -1 ? 0 : appLimit,
      unlimited: appLimit === -1,
    },
    published: {
      used: publishedCount,
      limit: pubLimit === -1 ? 0 : pubLimit,
      unlimited: pubLimit === -1,
    },
  };
}
