import type { Role } from "@prisma/client";
import { getDb } from "./db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export const ROLE_ORDER: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export function atLeast(role: Role, min: Role): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[min];
}

export interface Access {
  role: Role;
  projectId: string;
}

/** Resolve caller's role on a project: owner > collaborator, else null. */
export async function roleOnProject(projectId: string, userId: string): Promise<Role | null> {
  const db = getDb();
  if (!db) return null;
  const project = await db.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return null;
  if (project.ownerId === userId) return "OWNER";
  const collab = await db.projectCollaborator.findUnique({ where: { projectId_userId: { projectId, userId } } });
  return collab?.role ?? null;
}

/**
 * Assert the user can access the project at the required minimum role.
 * Returns project row metadata so callers avoid an extra query.
 */
export async function assertAccess(projectId: string, userId: string, minRole: Role = "EDITOR"): Promise<{ projectId: string; role: Role }> {
  const db = getDb();
  if (!db) return { projectId, role: minRole }; // no db → upstream will fail on data ops
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new NotFoundError("Project");
  const role = await roleOnProject(projectId, userId);
  if (!role) throw new ForbiddenError("You do not have access to this project.");
  if (!atLeast(role, minRole)) {
    throw new ForbiddenError(`This action requires the ${minRole.toLowerCase()} role on this project.`);
  }
  return { projectId, role };
}

export async function assertOwnsProject(projectId: string, userId: string): Promise<void> {
  await assertAccess(projectId, userId, "OWNER");
}
