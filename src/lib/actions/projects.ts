"use server";

import type { WebsiteSchema } from "@/types/website";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/server/logger";
import { createProject, renameProject, setProjectStatus, deleteProject, duplicateProject } from "@/lib/server/data/projects";
import { saveSchemaVersion } from "@/lib/server/data/versions";
import { TEMPLATE_METAS, buildTemplateSite } from "@/lib/templates/catalog";
import { toastError } from "@/lib/actions/shared";

export type ActionResult = { ok: boolean; projectId?: string; error?: string };

/** Create a project: blank, or instantiated from a template slug. */
export async function createProjectAction(input: { name?: string; template?: string }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const templateSlug = input.template?.trim();
    let name = (input.name ?? "").trim();
    let doc: WebsiteSchema | null = null;

    if (templateSlug) {
      const meta = TEMPLATE_METAS.find((t) => t.slug === templateSlug || t.category.toLowerCase() === templateSlug.toLowerCase());
      if (!meta) return { ok: false, error: "Unknown template." };
      doc = buildTemplateSite(meta.category);
      name = name || `${meta.name} — ${(doc.metadata as { name: string }).name}`;
    }
    if (!name) name = "Untitled Project";
    if (name.length > 80) return { ok: false, error: "Project name must be under 80 characters." };

    const projectId = await createProject({ name, ownerId: user.id, status: doc ? "READY" : "DRAFT" });

    if (doc) {
      await saveSchemaVersion({ projectId, schema: doc, message: "Initialized from template", createdById: user.id, createVersion: true });
    }
    return { ok: true, projectId };
  } catch (e) {
    logger.error("project.create_failed", { error: e instanceof Error ? e.stack ?? e.message : String(e), template: input.template ?? null, name: (input.name ?? "").slice(0, 60) });
    return { ok: false, error: toastError(e) };
  }
}

/** Update project display details (used by the studio settings modal). */
export async function updateProjectAction(input: { projectId: string; name?: string; description?: string }): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const { projectId } = await assertAccess(input.projectId, user.id, "ADMIN");
    const name = input.name?.trim();
    if (name !== undefined) {
      if (name.length < 1 || name.length > 80) return { ok: false, error: "Project name must be 1–80 characters." };
      await renameProject(projectId, name, user.id);
    }
    if (input.description !== undefined) {
      const db = requireDb();
      await db.project.update({ where: { id: projectId }, data: { description: input.description.slice(0, 300) } });
    }
    return { ok: true, projectId };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function archiveProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const p = await assertAccess(projectId, user.id, "ADMIN");
    await setProjectStatus(p.projectId, "ARCHIVED", user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function restoreProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const p = await assertAccess(projectId, user.id, "ADMIN");
    await setProjectStatus(p.projectId, "READY", user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function duplicateProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    await assertAccess(projectId, user.id, "VIEWER");
    const id = await duplicateProject(projectId, user.id);
    return { ok: true, projectId: id };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUserOrThrow();
  try {
    const p = await assertAccess(projectId, user.id, "OWNER");
    await deleteProject(p.projectId, user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

/** Replace current project content with a template (keeps project + history). */
export async function loadTemplateIntoProjectAction(projectId: string, templateSlug: string): Promise<{ ok: boolean; doc?: WebsiteSchema; error?: string }> {
  const user = await requireUserOrThrow();
  try {
    await assertAccess(projectId, user.id, "EDITOR");
    const meta = TEMPLATE_METAS.find((t) => t.slug === templateSlug || t.category.toLowerCase() === templateSlug.toLowerCase());
    if (!meta) return { ok: false, error: "Unknown template." };
    const doc = buildTemplateSite(meta.category);
    await saveSchemaVersion({ projectId, schema: doc, message: `Loaded ${meta.name} template`, createdById: user.id, createVersion: true });
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, error: toastError(e) };
  }
}

/** Unique slug preview for a project name. */
export async function slugPreviewAction(name: string): Promise<string> {
  const db = requireDb();
  const base = slugify(name) || "site";
  let slug = base;
  let i = 2;
  while (true) {
    const hit = await db.project.findUnique({ where: { slug }, select: { id: true } });
    if (!hit) return `${slug}.${process.env.WEBFORGE_APP_BASE ?? "webforge.app"}`;
    slug = `${base}-${i++}`;
  }
}

