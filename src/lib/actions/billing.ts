"use server";

import type { Plan } from "@prisma/client";
import { requireUserOrThrow } from "@/lib/server/session";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/server/billing";
import { toastError } from "./shared";

export type ActionResult = { ok: boolean; error?: string; url?: string };

export async function checkoutAction(plan: Plan): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const url = await createCheckoutSession({ userId: user.id, plan });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function portalAction(): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const url = await createBillingPortalSession(user.id);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}
