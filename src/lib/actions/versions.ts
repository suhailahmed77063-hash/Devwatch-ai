"use server";

import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { listVersions, restoreVersion } from "@/lib/server/data/versions";
import { toastError } from "./shared";

export type ActionResult = { ok: boolean; error?: string; version?: number };

export async function restoreVersionAction(projectId: string, versionId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    await assertAccess(projectId, user.id, "EDITOR");
    const version = await restoreVersion(projectId, versionId, user.id);
    return { ok: true, version };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function listVersionsAction(projectId: string) {
  const user = await requireUserOrThrow();
  await assertAccess(projectId, user.id, "VIEWER");
  return listVersions(projectId);
}
