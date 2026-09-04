"use server";

import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { PLANS } from "@/lib/constants";
import { addDomain, removeDomain, verifyDomain, listDomains } from "@/lib/server/data/domains";
import { ConflictError } from "@/lib/errors";
import { toastError } from "./shared";

export type ActionResult = { ok: boolean; error?: string; message?: string };

export async function addDomainAction(input: { projectId: string; domain: string }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const db = requireDb();
    const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!PLANS[me.plan].customDomains) {
      return { ok: false, error: "Custom domains are a Pro feature. Upgrade in Billing to connect your own domain." };
    }
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    await addDomain(projectId, input.domain, user.id);
    return { ok: true, message: "Domain added. Point the DNS records below, then verify." };
  } catch (e) {
    if (e instanceof ConflictError) return { ok: false, error: e.publicMessage };
    return { ok: false, error: toastError(e) };
  }
}

export async function verifyDomainAction(domainId: string, projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    await assertAccess(projectId, user.id, "ADMIN");
    const res = await verifyDomain(domainId, user.id);
    if (res.status === "ACTIVE") return { ok: true, message: "Domain verified — DNS is pointing at WebForge." };
    return { ok: false, error: "DNS hasn't propagated yet. Records found: " + (res.found.join(", ") || "none") + ". Wait a few minutes and verify again." };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function removeDomainAction(domainId: string, projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    await assertAccess(projectId, user.id, "ADMIN");
    await removeDomain(domainId, user.id);
    return { ok: true, message: "Domain removed." };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function listDomainsAction(projectId: string) {
  const user = await requireUserOrThrow();
  await assertAccess(projectId, user.id, "VIEWER");
  return listDomains(projectId);
}
