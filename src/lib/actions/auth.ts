"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requireDb } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { sendEmail, emailHtml } from "@/lib/server/email";
import { optEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import { requireUserOrThrow } from "@/lib/server/session";
import { logAudit } from "@/lib/server/audit";

const appUrl = () => optEnv("APP_URL") ?? "http://localhost:3000";

export type ActionResult = { ok: boolean; message?: string; error?: string };

const signupSchema = z.object({
  name: z.string().min(1, "Enter your name").max(80),
  email: z.string().email("Enter a valid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function registerUser(input: unknown): Promise<ActionResult> {
  const db = requireDb();
  await rateLimit({ key: `signup:${new URL(appUrl()).hostname ?? "local"}`, limit: 20, windowSec: 3600 });
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists. Try signing in instead." };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.create({
    data: {
      name: parsed.data.name.trim().slice(0, 80),
      email,
      passwordHash,
    },
  });

  // email verification token
  const token = crypto.randomBytes(24).toString("base64url");
  await db.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  const link = `${appUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your WebForge AI account",
    html: emailHtml("Confirm your email", `Welcome, <b>${esc(parsed.data.name)}</b>! Confirm your address to activate your account.`, { label: "Confirm email", href: link }),
    text: `Confirm your WebForge AI account: ${link}`,
  }).catch((e) => logger.warn("auth.verify_email_send_failed", { error: e instanceof Error ? e.message : String(e) }));

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      logger.warn("auth.auto_signin_failed", { error: e.message });
      return { ok: true, message: "Account created. Please sign in." };
    }
    throw e;
  }
  await logAudit({ actorId: user.id, action: "auth.signup", entity: "User", entityId: user.id, meta: { method: "credentials" } });
  return { ok: true, message: "Account created" };
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  const db = requireDb();
  if (!token) return { ok: false, error: "Missing verification token." };
  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row) return { ok: false, error: "This verification link is invalid or already used." };
  if (row.expires < new Date()) return { ok: false, error: "This verification link has expired — request a new one." };
  await db.user.update({ where: { email: row.identifier }, data: { emailVerified: new Date() } });
  await db.verificationToken.deleteMany({ where: { identifier: row.identifier } });
  return { ok: true, message: "Email verified. You're all set!" };
}

export async function resendVerification(): Promise<ActionResult> {
  const session = await requireUserOrThrow();
  const db = requireDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  if (user.emailVerified) return { ok: true, message: "Your email is already verified." };
  if (!user.email) return { ok: false, error: "No email on this account." };
  const token = crypto.randomBytes(24).toString("base64url");
  await db.verificationToken.create({ data: { identifier: user.email, token, expires: new Date(Date.now() + 24 * 3600 * 1000) } });
  const link = `${appUrl()}/verify-email?token=${token}`;
  await sendEmail({ to: user.email, subject: "Confirm your WebForge AI account", html: emailHtml("Confirm your email", "Click below to confirm your address.", { label: "Confirm email", href: link }), text: link });
  return { ok: true, message: "Verification email sent." };
}

export async function requestPasswordReset(emailRaw: string): Promise<ActionResult> {
  const db = requireDb();
  await rateLimit({ key: `forgot:${emailRaw.toLowerCase()}`, limit: 3, windowSec: 3600 });
  const email = emailRaw.trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: true, message: "If that account exists, a reset link is on its way." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: true, message: "If that account exists, a reset link is on its way." };
  const token = crypto.randomBytes(24).toString("base64url");
  await db.verificationToken.create({ data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 60 * 60 * 1000) } });
  const link = `${appUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your WebForge AI password",
    html: emailHtml("Reset your password", "You asked to reset your password. This link expires in 1 hour.", { label: "Reset password", href: link }),
    text: `Reset your password: ${link}`,
  }).catch((e) => logger.warn("auth.reset_send_failed", { error: e instanceof Error ? e.message : String(e) }));
  await logAudit({ actorId: user.id, action: "auth.password_reset_requested", entity: "User", entityId: user.id });
  return { ok: true, message: "If that account exists, a reset link is on its way." };
}

export async function resetPassword(token: string, newPasswordRaw: string): Promise<ActionResult> {
  const db = requireDb();
  const password = newPasswordRaw;
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row || !row.identifier.startsWith("reset:")) return { ok: false, error: "This reset link is invalid or has expired." };
  if (row.expires < new Date()) return { ok: false, error: "This reset link has expired — request a new one." };
  const email = row.identifier.slice("reset:".length);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.update({ where: { email }, data: { passwordHash } });
  await db.verificationToken.deleteMany({ where: { identifier: row.identifier } });
  return { ok: true, message: "Password updated — sign in with your new password." };
}

export async function updateProfile(input: { name?: string; image?: string }): Promise<ActionResult> {
  const session = await requireUserOrThrow();
  const db = requireDb();
  const data: { name?: string; image?: string } = {};
  if (input.name) {
    const n = input.name.trim();
    if (n.length < 1 || n.length > 80) return { ok: false, error: "Name must be 1–80 characters." };
    data.name = n;
  }
  if (typeof input.image === "string") data.image = input.image.slice(0, 1000);
  await db.user.update({ where: { id: session.id }, data });
  await logAudit({ actorId: session.id, action: "profile.update", entity: "User", entityId: session.id });
  return { ok: true, message: "Profile updated" };
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const session = await requireUserOrThrow();
  const db = requireDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!user.passwordHash) return { ok: false, error: "Your account uses social login and has no password. Set one via “password reset”." };
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: "Current password is incorrect." };
  if (input.newPassword.length < 8) return { ok: false, error: "New password must be at least 8 characters." };
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await db.user.update({ where: { id: session.id }, data: { passwordHash } });
  await logAudit({ actorId: session.id, action: "security.password_changed", entity: "User", entityId: session.id });
  return { ok: true, message: "Password changed" };
}

export async function deleteAccount(): Promise<ActionResult> {
  const session = await requireUserOrThrow();
  const db = requireDb();
  await db.user.delete({ where: { id: session.id } });
  return { ok: true, message: "Account deleted" };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
