import type { Prisma } from "@prisma/client";
import { logger } from "./logger";
import { getDb } from "./db";

export async function logAudit(input: {
  actorId?: string | null;
  projectId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  ip?: string;
}): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db.auditLog.create({ data: input as Prisma.AuditLogUncheckedCreateInput });
  } catch (e) {
    logger.warn("audit.write_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}
