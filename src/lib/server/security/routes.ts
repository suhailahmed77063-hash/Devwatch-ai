/**
 * Security Agent — API route helpers (auth + organization isolation).
 *
 * Every security-agent endpoint funnels through these guards:
 *   requireUserOrThrow  → session
 *   assertAccess        → role on the owning project (isolation boundary)
 *   loadFindingForActor → finding + role in one path, 404 when absent
 */

import type { SecurityFinding, Role } from "@prisma/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { requireDb } from "../db";
import { requireUserOrThrow, type SessionUser } from "../session";
import { assertAccess, atLeast } from "../access";

export interface SecurityRouteContext {
  user: SessionUser;
  role: Role;
  projectId: string;
}

/** Authenticate + authorize a security endpoint against a project. */
export async function guardSecurityRoute(
  projectId: string,
  minRole: Role = "EDITOR"
): Promise<SecurityRouteContext> {
  const user = await requireUserOrThrow();
  const { role } = await assertAccess(projectId, user.id, minRole);
  return { user, role, projectId };
}

/** Load a finding enforcing project isolation; throws NotFound when absent. */
export async function loadFindingForActor(
  findingId: string,
  userId: string,
  minRole: Role = "VIEWER"
): Promise<{ finding: SecurityFinding; role: Role; projectId: string }> {
  const db = requireDb();
  const finding = await db.securityFinding.findUnique({
    where: { id: findingId },
    include: { run: { select: { repoUrl: true, repoSource: true } } },
  });
  if (!finding) throw new NotFoundError("Security finding");
  const { role } = await assertAccess(finding.projectId, userId, minRole);
  return { finding, role, projectId: finding.projectId };
}

/** Forbidden helper for tool-permission denials surfaced as 403. */
export function forbidden(msg: string): ForbiddenError {
  return new ForbiddenError(msg);
}

/** 404 when the route is hit without DB configured. */
export function assertDbReady(): void {
  requireDb();
}
