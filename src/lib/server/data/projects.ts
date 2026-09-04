import type { Prisma, ProjectStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { requireDb } from "../db";
import { slugify } from "@/lib/utils";
import { logAudit } from "../audit";
import { getDb } from "../db";

function assertDb() {
  return requireDb();
}

/** Global unique slug for the {slug}.webforge.app subdomain. */
export async function uniqueProjectSlug(base: string, projectIdToSkip?: string): Promise<string> {
  const db = assertDb();
  const stem = slugify(base) || "site";
  let slug = stem;
  let i = 2;
  while (true) {
    const existing = await db.project.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === projectIdToSkip) return slug;
    slug = `${stem}-${i++}`;
    if (i > 50) return `${stem}-${Math.floor(Math.random() * 1e5)}`;
  }
}

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  role: string;
  updatedAt: Date;
  createdAt: Date;
  publishedUrl: string | null;
  pageCount: number;
}

export async function listProjectsForUser(userId: string, opts: { includeArchived?: boolean } = {}): Promise<ProjectListItem[]> {
  const db = assertDb();
  const owned = await db.project.findMany({
    where: { ownerId: userId, ...(opts.includeArchived ? {} : { status: { not: "ARCHIVED" } }) },
    orderBy: { updatedAt: "desc" },
    include: { currentVersion: { select: { schema: true } }, deployments: { where: { isPublished: true, status: "READY" }, select: { url: true }, take: 1 } },
  });
  const collab = await db.projectCollaborator.findMany({
    where: { userId, ...(opts.includeArchived ? {} : { project: { status: { not: "ARCHIVED" } } }) },
    include: { project: { include: { currentVersion: { select: { schema: true } }, deployments: { where: { isPublished: true, status: "READY" }, select: { url: true }, take: 1 } } } },
  });

  const map = (p: (typeof owned)[number], role: string): ProjectListItem => {
    const schema = p.currentVersion?.schema as { pages?: unknown[] } | null | undefined;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      status: p.status,
      role,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      publishedUrl: p.deployments[0]?.url ?? null,
      pageCount: schema?.pages?.length ?? 0,
    };
  };

  const items: ProjectListItem[] = [];
  for (const p of owned) items.push(map(p, "OWNER"));
  for (const c of collab) items.push(map(c.project, c.role));
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return items;
}

export async function getProjectMeta(projectId: string): Promise<NonNullable<Awaited<ReturnType<typeof getProject>>>["meta"]> {
  const p = await getProject(projectId);
  return p.meta;
}

/** Full project (meta + schema) by id. Throws NotFound. */
export async function getProject(projectId: string) {
  const db = assertDb();
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      currentVersion: { select: { id: true, version: true, schema: true, message: true, createdAt: true } },
    },
  });
  if (!project) throw new NotFoundError("Project");
  const meta = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    framework: project.framework,
    aiConfig: project.aiConfig,
    currentVersion: project.currentVersion,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  const schema = (project.currentSchema ?? project.currentVersion?.schema ?? null) as unknown;
  return { meta, schema };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: string;
  schema?: unknown;
  status?: ProjectStatus;
}

export async function createProject(input: CreateProjectInput): Promise<string> {
  const db = assertDb();
  const slug = await uniqueProjectSlug(input.name);
  const project = await db.project.create({
    data: {
      name: input.name.slice(0, 80),
      description: input.description?.slice(0, 300),
      slug,
      ownerId: input.ownerId,
      status: input.status ?? "DRAFT",
      ...(input.schema ? { currentSchema: input.schema as Prisma.InputJsonValue } : {}),
    },
  });
  await logAudit({ actorId: input.ownerId, projectId: project.id, action: "project.create", entity: "Project", entityId: project.id });
  return project.id;
}

export async function renameProject(projectId: string, name: string, actorId: string): Promise<void> {
  const db = assertDb();
  await db.project.update({ where: { id: projectId }, data: { name: name.slice(0, 80) } });
  await logAudit({ actorId, projectId, action: "project.rename", entity: "Project", entityId: projectId, meta: { name } });
}

export async function setProjectStatus(projectId: string, status: ProjectStatus, actorId: string): Promise<void> {
  const db = assertDb();
  await db.project.update({ where: { id: projectId }, data: { status } });
  await logAudit({ actorId, projectId, action: `project.${status.toLowerCase()}`, entity: "Project", entityId: projectId });
}

/** Full duplication including schema history of the current version. */
export async function duplicateProject(projectId: string, ownerId: string): Promise<string> {
  const db = assertDb();
  const src = await db.project.findUnique({
    where: { id: projectId },
    include: { currentVersion: { select: { schema: true } }, assets: true },
  });
  if (!src) throw new NotFoundError("Project");
  const slug = await uniqueProjectSlug(`${src.name} copy`);
  const newId = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: `${src.name} (copy)`,
        slug,
        description: src.description,
        ownerId,
        framework: src.framework,
        status: src.currentVersion?.schema ? "READY" : "DRAFT",
        currentSchema: src.currentSchema ?? undefined,
        assets: src.assets.length
          ? {
              create: src.assets.map((a) => ({
                ownerId,
                kind: a.kind,
                name: a.name,
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
                width: a.width,
                height: a.height,
                storageKey: a.storageKey,
                url: a.url,
                alt: a.alt,
                isAiGenerated: a.isAiGenerated,
              })),
            }
          : undefined,
      },
    });
    return created.id;
  });
  // version 1 snapshot of duplicated schema
  if (src.currentVersion?.schema) {
    const dbc = assertDb();
    const version = await dbc.projectVersion.create({
      data: { projectId: newId, version: 1, schema: src.currentVersion.schema as Prisma.InputJsonValue, message: "Initial copy" },
    });
    await dbc.project.update({ where: { id: newId }, data: { currentVersionId: version.id } });
  }
  await logAudit({ actorId: ownerId, projectId: newId, action: "project.duplicate", entity: "Project", entityId: newId, meta: { source: projectId } });
  return newId;
}

export async function deleteProject(projectId: string, actorId: string): Promise<void> {
  const db = assertDb();
  await db.project.delete({ where: { id: projectId } });
  await logAudit({ actorId, projectId, action: "project.delete", entity: "Project", entityId: projectId });
}

export async function projectExistsForSlug(slug: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  return Boolean(await db.project.findUnique({ where: { slug }, select: { id: true } }));
}

export async function resolveOwnerOf(projectId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const p = await db.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  return p?.ownerId ?? null;
}

export async function bumpProjectTouched(projectId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
}
