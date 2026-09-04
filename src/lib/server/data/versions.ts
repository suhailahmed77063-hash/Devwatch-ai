import type { Prisma } from "@prisma/client";
import type { WebsiteSchema } from "@/types/website";
import { NotFoundError } from "@/lib/errors";
import { requireDb } from "../db";
import { logAudit } from "../audit";

/**
 * Save the given schema as the project's current state.
 *
 * - When `message` is provided a ProjectVersion row is created (history entry).
 * - Project.currentSchema is always kept in sync so auto-saves never lose work.
 * - Page/Section/Component rows are *projections* of the current schema for
 *   fast listing; the version JSON remains the single source of truth.
 */
export async function saveSchemaVersion(input: {
  projectId: string;
  schema: WebsiteSchema;
  message?: string;
  createdById?: string | null;
  createVersion?: boolean;
}): Promise<{ versionId: string | null; versionNumber: number | null }> {
  const db = requireDb();
  const project = await db.project.findUnique({ where: { id: input.projectId }, select: { currentVersion: { select: { version: true } } } });
  if (!project) throw new NotFoundError("Project");

  const shouldCreate = input.createVersion ?? Boolean(input.message);
  const nextNumber = (project.currentVersion?.version ?? 0) + 1;

  const jsonSchema = input.schema as unknown as Prisma.InputJsonValue;

  const result = await db.$transaction(async (tx) => {
    let versionId: string | null = null;
    if (shouldCreate) {
      const v = await tx.projectVersion.create({
        data: {
          projectId: input.projectId,
          version: nextNumber,
          schema: jsonSchema,
          message: input.message?.slice(0, 300) ?? null,
          createdById: input.createdById ?? null,
        },
      });
      versionId = v.id;
    }
    const updateData: Prisma.ProjectUpdateInput = {
      currentSchema: jsonSchema,
      status: "READY",
      ...(versionId ? { currentVersion: { connect: { id: versionId } } } : {}),
    };
    await tx.project.update({ where: { id: input.projectId }, data: updateData });

    // Refresh projections from the current schema.
    await tx.page.deleteMany({ where: { projectId: input.projectId } });
    await tx.component.deleteMany({ where: { projectId: input.projectId } });
    for (const [pageIdx, page] of input.schema.pages.entries()) {
      const created = await tx.page.create({
        data: {
          projectId: input.projectId,
          slug: page.slug,
          name: page.name,
          order: pageIdx,
          seo: page.seo as unknown as Prisma.InputJsonValue,
        },
      });
      for (const [secIdx, sec] of page.sections.entries()) {
        await tx.section.create({
          data: {
            projectId: input.projectId,
            pageId: created.id,
            sectionId: sec.id,
            type: sec.type,
            order: secIdx,
            title: typeof (sec.props as { title?: unknown }).title === "string" ? ((sec.props as { title: string }).title.slice(0, 200)) : undefined,
          },
        });
      }
    }
    const g = input.schema.globalComponents;
    if (g.navbar.enabled) {
      await tx.component.create({ data: { projectId: input.projectId, type: "navbar", name: "Navbar", props: g.navbar as unknown as Prisma.InputJsonValue, order: 0 } });
    }
    if (g.footer.enabled) {
      await tx.component.create({ data: { projectId: input.projectId, type: "footer", name: "Footer", props: g.footer as unknown as Prisma.InputJsonValue, order: 1 } });
    }
    return versionId;
  });

  await logAudit({
    actorId: input.createdById,
    projectId: input.projectId,
    action: shouldCreate ? "version.create" : "project.autosave",
    entity: "ProjectVersion",
    entityId: result ?? undefined,
    meta: { message: input.message ?? null },
  });
  return { versionId: result, versionNumber: shouldCreate ? nextNumber : null };
}

export async function listVersions(projectId: string) {
  const db = requireDb();
  return db.projectVersion.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, message: true, createdAt: true, createdBy: { select: { name: true, email: true } } },
    take: 200,
  });
}

export async function getVersion(projectId: string, versionId: string) {
  const db = requireDb();
  const v = await db.projectVersion.findFirst({ where: { id: versionId, projectId } });
  if (!v) throw new NotFoundError("Version");
  return v;
}

/** Roll the project back to an old version by creating a NEW version from it. */
export async function restoreVersion(projectId: string, versionId: string, actorId: string): Promise<number> {
  const db = requireDb();
  const old = await getVersion(projectId, versionId);
  const schema = old.schema as unknown as WebsiteSchema;
  const { versionNumber } = await saveSchemaVersion({
    projectId,
    schema,
    message: `Restored version ${old.version}${old.message ? ` (“${old.message}”)` : ""}`,
    createdById: actorId,
    createVersion: true,
  });
  await logAudit({ actorId, projectId, action: "version.restore", entity: "ProjectVersion", entityId: old.id, meta: { to: versionNumber } });
  return versionNumber ?? 0;
}
