"use server";

import crypto from "node:crypto";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess, roleOnProject, ROLE_ORDER } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { ConflictError, ValidationError } from "@/lib/errors";
import { sendEmail, emailHtml } from "@/lib/server/email";
import { optEnv } from "@/lib/server/env";
import { PLANS } from "@/lib/constants";
import { logAudit } from "@/lib/server/audit";
import { toastError } from "./shared";

export type ActionResult = { ok: boolean; error?: string; message?: string; projectId?: string };

export async function inviteMemberAction(input: { projectId: string; email: string; role: Role }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const userRow = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!PLANS[userRow.plan].teamSeats) {
      return { ok: false, error: "Team collaboration is an Enterprise feature. Upgrade to invite teammates." };
    }
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    const email = input.email.trim().toLowerCase();
    if (!z.string().email().safeParse(email).success) return { ok: false, error: "Enter a valid email address." };
    const role = (["VIEWER", "EDITOR", "ADMIN"] as Role[]).includes(input.role) ? input.role : "VIEWER";

    const existingMember = await db.user.findUnique({ where: { email } });
    if (existingMember) {
      const existing = await roleOnProject(projectId, existingMember.id);
      if (existing) return { ok: false, error: "That user already has access to this project." };
    }
    const token = crypto.randomBytes(24).toString("base64url");
    const invite = await db.invitation.create({
      data: {
        projectId,
        email,
        role,
        token,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } });
    const link = `${optEnv("APP_URL") ?? "http://localhost:3000"}/invite/accept?token=${token}`;
    await sendEmail({
      to: email,
      subject: `${user.name ?? "Someone"} invited you to “${project.name}” on WebForge AI`,
      html: emailHtml("You're invited to collaborate", `You've been invited as <b>${role.toLowerCase()}</b> to the project <b>${esc(project.name)}</b>.`, { label: "Accept invitation", href: link }),
      text: `Accept the invitation: ${link}`,
    });
    await logAudit({ actorId: user.id, projectId, action: "member.invite", entity: "Invitation", entityId: invite.id, meta: { email, role } });
    return { ok: true, message: `Invitation sent to ${email}.` };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const invite = await db.invitation.findUnique({ where: { token } });
    if (!invite) return { ok: false, error: "This invitation is invalid or was already used." };
    if (invite.status !== "PENDING") return { ok: false, error: "This invitation is no longer active." };
    if (invite.expiresAt < new Date()) return { ok: false, error: "This invitation has expired." };
    const invitedUser = await db.user.findUnique({ where: { email: invite.email } });
    if (!invitedUser || invitedUser.id !== user.id) {
      return { ok: false, error: "Sign in with the email the invitation was sent to." };
    }
    const existing = await roleOnProject(invite.projectId, user.id);
    await db.$transaction(async (tx) => {
      if (!existing) {
        await tx.projectCollaborator.create({ data: { projectId: invite.projectId, userId: user.id, role: invite.role } });
      } else if (ROLE_ORDER[invite.role] > ROLE_ORDER[existing]) {
        await tx.projectCollaborator.update({ where: { projectId_userId: { projectId: invite.projectId, userId: user.id } }, data: { role: invite.role } });
      }
      await tx.invitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedById: user.id } });
    });
    return { ok: true, message: "You're in! Open the project from your dashboard.", projectId: invite.projectId };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function listMembersAction(projectId: string) {
  const user = await requireUserOrThrow();
  const db = requireDb();
  await assertAccess(projectId, user.id, "VIEWER");
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { owner: { select: { id: true, name: true, email: true, image: true } }, collaborators: { include: { user: { select: { id: true, name: true, email: true, image: true } } } }, invitations: { where: { status: "PENDING" }, select: { id: true, email: true, role: true, createdAt: true } } },
  });
  const members = [
    { id: project.owner.id, name: project.owner.name, email: project.owner.email, role: "OWNER" as Role, pending: false },
    ...project.collaborators.map((c) => ({ id: c.user.id, name: c.user.name, email: c.user.email, role: c.role, pending: false })),
    ...project.invitations.map((i) => ({ id: i.id, name: null, email: i.email, role: i.role, pending: true })),
  ];
  return members;
}

export async function updateMemberRoleAction(input: { projectId: string; userId: string; role: Role }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    const role = (["VIEWER", "EDITOR", "ADMIN"] as Role[]).includes(input.role) ? input.role : "VIEWER";
    const member = await db.projectCollaborator.findUnique({ where: { projectId_userId: { projectId, userId: input.userId } } });
    if (!member) return { ok: false, error: "Member not found." };
    await db.projectCollaborator.update({ where: { id: member.id }, data: { role } });
    await logAudit({ actorId: user.id, projectId, action: "member.role_update", entity: "User", entityId: input.userId, meta: { role } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function removeMemberAction(input: { projectId: string; userId: string }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    const member = await db.projectCollaborator.findUnique({ where: { projectId_userId: { projectId, userId: input.userId } } });
    if (!member) return { ok: false, error: "Member not found." };
    await db.projectCollaborator.delete({ where: { id: member.id } });
    await logAudit({ actorId: user.id, projectId, action: "member.remove", entity: "User", entityId: input.userId });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function revokeInvitationAction(input: { projectId: string; invitationId: string }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    await db.invitation.update({ where: { id: input.invitationId }, data: { status: "REVOKED" } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export { ConflictError, ValidationError };
