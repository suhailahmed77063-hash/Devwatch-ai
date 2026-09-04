"use server";

import { requireUserOrThrow } from "@/lib/server/session";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/server/data/api-keys";
import { toastError } from "./shared";

export type ActionResult = { ok: boolean; error?: string; key?: { id: string; plain: string; prefix: string } };

export async function createKeyAction(name: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const key = await createApiKey({ userId: user.id, name });
    return { ok: true, key };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function listKeysAction() {
  const user = await requireUserOrThrow();
  return listApiKeys(user.id);
}

export async function revokeKeyAction(keyId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    await revokeApiKey(user.id, keyId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}
