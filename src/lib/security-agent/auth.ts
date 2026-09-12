/**
 * AI Security Agent — actor resolution & authorization.
 *
 * Every security-agent endpoint funnels through here:
 *   getSecurityActor()  → session user + org membership + effective role
 *   loadFindingForActor → finding + org isolation check
 *
 * Effective role = organization_members.role when the user belongs to the
 * org, else users.role. Organization isolation: an actor can only ever touch
 * rows whose orgId matches their membership.
 */

import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { db } from "@/lib/db";
import { users, organizationMembers, organizations, securityFindings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type AgentRole = "super_admin" | "admin" | "viewer" | "readonly";

export interface SecurityActor {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
  role: AgentRole;
  /** GitHub token for repo access: session token → stored token → app token. */
  githubToken?: string;
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not permitted") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

// One shared NextAuth instance for server-side session reads.
const { auth } = NextAuth(authConfig);

interface SessionShape {
  user?: { id?: string; email?: string | null; name?: string | null };
  accessToken?: string;
}

export async function getSecurityActor(): Promise<SecurityActor> {
  const session = (await auth()) as SessionShape | null;
  const sessionUserId = session?.user?.id;
  const email = session?.user?.email ?? null;

  if (!sessionUserId && !email) throw new UnauthorizedError();

  // Resolve the users row (session id may be a provider id for GitHub users).
  let userRow: typeof users.$inferSelect | undefined;
  if (sessionUserId) {
    const byId = await db.select().from(users).where(eq(users.id, sessionUserId)).limit(1);
    userRow = byId[0];
  }
  if (!userRow && email) {
    const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    userRow = byEmail[0];
  }
  if (!userRow) throw new UnauthorizedError("Session user not found in workspace");

  // Resolve org membership (first membership; DevWatch is single-org per user).
  const membership = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, userRow.id))
    .limit(1);

  const org = membership[0];
  if (!org) throw new ForbiddenError("You are not a member of any organization");

  return {
    userId: userRow.id,
    email: userRow.email,
    name: userRow.name,
    orgId: org.orgId,
    orgName: org.orgName,
    role: (org.role ?? userRow.role) as AgentRole,
    githubToken: session?.accessToken ?? userRow.githubToken ?? undefined,
  };
}

/** Load a finding enforcing organization isolation. */
export async function loadFindingForActor(findingId: string, actor: SecurityActor) {
  const rows = await db
    .select()
    .from(securityFindings)
    .where(and(eq(securityFindings.id, findingId), eq(securityFindings.orgId, actor.orgId)))
    .limit(1);
  const finding = rows[0];
  if (!finding) throw new NotFoundError("Finding not found");
  return finding;
}

/** Sandbox validation requires admin or super_admin (defense in depth vs the tool policy). */
export function assertCanValidate(role: AgentRole): void {
  if (role !== "admin" && role !== "super_admin") {
    throw new ForbiddenError("Sandbox validation requires an admin or super_admin role");
  }
}
