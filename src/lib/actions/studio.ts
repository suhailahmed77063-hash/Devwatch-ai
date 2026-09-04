"use server";

import type { WebsiteSchema } from "@/types/website";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { normalizeWebsite } from "@/lib/website/schema";
import { saveSchemaVersion } from "@/lib/server/data/versions";
import { bumpProjectTouched } from "@/lib/server/data/projects";
import { toastError } from "./shared";

export type SaveResult = { ok: boolean; savedAt?: string; version?: number | null; error?: string };

/** Persist the current working document. `message` triggers a version entry. */
export async function saveProjectDocAction(input: {
  projectId: string;
  doc: unknown;
  message?: string;
  createVersion?: boolean;
  renameTo?: string | null;
}): Promise<SaveResult> {
  const user = await requireUserOrThrow();
  try {
    const { projectId } = await assertAccess(input.projectId, user.id, "EDITOR");
    const doc = normalizeWebsite(input.doc); // validates before touching the DB
    const saved = await saveSchemaVersion({
      projectId,
      schema: doc,
      message: input.message || (input.createVersion ? "Manual save" : undefined),
      createdById: user.id,
      createVersion: input.createVersion,
    });
    if (input.renameTo && input.renameTo.trim() && input.renameTo.trim() !== doc.metadata.name) {
      // keep the site name and project in sync when the user renames in-studio
      const db = await import("@/lib/server/db");
      const prisma = db.requireDb();
      await prisma.project.update({ where: { id: projectId }, data: { name: input.renameTo.trim().slice(0, 80) } });
    }
    await bumpProjectTouched(projectId);
    return { ok: true, savedAt: new Date().toISOString(), version: saved.versionNumber };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

/** Persist an autosave without creating a version entry. */
export async function autosaveProjectAction(projectId: string, doc: unknown): Promise<SaveResult> {
  return saveProjectDocAction({ projectId, doc });
}
