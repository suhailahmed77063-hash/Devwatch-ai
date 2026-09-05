import type { AppFile, AppRunStatus, Prisma } from "@prisma/client";
import { requireDb } from "../db";
import { encryptSecret, decryptSecret } from "../crypto";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { assertSafePath } from "./blueprint";
import { starterFiles, hasRealFiles } from "./templates";
import type { AppFileOp, PipelineStep, RunKind } from "@/types/app";

const MAX_TOTAL_BYTES = 16 * 1024 * 1024; // 16 MB virtual workspace cap

/** Ensure the workspace exists (starter files on first use). Returns path -> content map. */
export async function ensureAppWorkspace(projectId: string): Promise<Record<string, string>> {
  const db = requireDb();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (!project) throw new NotFoundError("Project");
  const count = await db.appFile.count({ where: { projectId } });
  if (count === 0) {
    const starter = starterFiles(project.name);
    await db.appFile.createMany({
      data: Object.entries(starter).map(([path, content]) => ({
        projectId,
        path,
        content,
        size: Buffer.byteLength(content),
      })),
    });
  }
  return readAppFiles(projectId);
}

/** path -> content map (used for disk sync, checkpoints, LLM context). */
export async function readAppFiles(projectId: string): Promise<Record<string, string>> {
  const db = requireDb();
  const rows = await db.appFile.findMany({ where: { projectId }, orderBy: { path: "asc" } });
  const out: Record<string, string> = {};
  for (const row of rows) out[row.path] = row.content;
  return out;
}

export async function listAppFiles(projectId: string): Promise<{ path: string; size: number; updatedAt: Date }[]> {
  const db = requireDb();
  return db.appFile.findMany({
    where: { projectId },
    orderBy: { path: "asc" },
    select: { path: true, size: true, updatedAt: true },
  });
}

export async function getAppFile(projectId: string, filePath: string): Promise<AppFile | null> {
  const db = requireDb();
  return db.appFile.findUnique({ where: { projectId_path: { projectId, path: filePath } } });
}

/** Apply a batch of validated ops to the DB rows. Returns labels for logs. */
export async function applyFileOps(projectId: string, ops: AppFileOp[], actorId?: string): Promise<string[]> {
  const db = requireDb();
  const current = await readAppFiles(projectId);
  const next = { ...current };
  const labels: string[] = [];

  for (const op of ops) {
    switch (op.kind) {
      case "create":
      case "edit": {
        const p = assertSafePath(op.path);
        if (p === "package-lock.json" || p.startsWith("node_modules/")) {
          throw new ValidationError("The agent cannot edit lockfiles or node_modules.");
        }
        next[p] = op.content;
        labels.push(`${op.kind === "create" ? "Create" : "Update"} ${p}`);
        break;
      }
      case "delete": {
        const p = assertSafePath(op.path);
        if (p === "package.json" || p === "tsconfig.json") {
          throw new ValidationError("The agent cannot delete package.json or tsconfig.json.");
        }
        delete next[p];
        labels.push(`Delete ${p}`);
        break;
      }
      case "rename": {
        const p = assertSafePath(op.path);
        const np = assertSafePath(op.newPath);
        if (!(p in next)) throw new ValidationError(`Cannot rename ${p}: file does not exist`);
        next[np] = next[p];
        delete next[p];
        labels.push(`Rename ${p} → ${np}`);
        break;
      }
    }
  }

  const totalBytes = Object.values(next).reduce((a, c) => a + Buffer.byteLength(c), 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new ValidationError(`Workspace is too large (${(totalBytes / 1024 / 1024).toFixed(1)} MB, limit 8 MB).`);
  }
  if (Object.keys(next).length > 200) {
    throw new ValidationError("Workspace file limit reached (200 files).");
  }

  await db.$transaction(async (tx) => {
    const existing = new Set((await tx.appFile.findMany({ where: { projectId }, select: { path: true } })).map((f) => f.path));
    const opsData: { projectId: string; path: string; content: string; size: number }[] = [];
    for (const [path, content] of Object.entries(next)) {
      opsData.push({ projectId, path, content, size: Buffer.byteLength(content) });
    }
    await tx.appFile.deleteMany({ where: { projectId } });
    await tx.appFile.createMany({ data: opsData });
    void existing;
  });

  void actorId;
  return labels;
}

/** Replace the whole workspace from a snapshot (checkpoint restore). */
export async function restoreFiles(projectId: string, snapshot: Record<string, string>): Promise<void> {
  const db = requireDb();
  const next: Record<string, string> = {};
  for (const [p, c] of Object.entries(snapshot)) {
    next[assertSafePath(p)] = typeof c === "string" ? c : JSON.stringify(c);
  }
  const ops: AppFileOp[] = Object.entries(next).map(([path, content]) => ({ kind: "edit", path, content }));
  await applyFileOps(projectId, ops);
}

// ── Runs ────────────────────────────────────────────────────────────────────

export async function createAppRun(input: { projectId: string; kind: RunKind; createdById?: string }): Promise<string> {
  const db = requireDb();
  const run = await db.appRun.create({ data: { projectId: input.projectId, kind: input.kind, createdById: input.createdById } });
  return run.id;
}

export async function updateAppRun(runId: string, input: { status?: AppRunStatus; steps?: PipelineStep[]; summary?: string | null; error?: string | null; durationMs?: number | null; finishedAt?: Date | null }) {
  const db = requireDb();
  const data: Prisma.AppRunUpdateInput = {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.steps !== undefined ? { steps: input.steps as unknown as Prisma.InputJsonValue } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
    ...(input.finishedAt !== undefined ? { finishedAt: input.finishedAt } : {}),
  };
  return db.appRun.update({ where: { id: runId }, data });
}

export async function listAppRuns(projectId: string, limit = 10) {
  const db = requireDb();
  return db.appRun.findMany({
    where: { projectId },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true, kind: true, status: true, steps: true, summary: true, error: true, durationMs: true, startedAt: true, finishedAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
}

// ── Checkpoints ─────────────────────────────────────────────────────────────

export async function createCheckpoint(projectId: string, message: string, actorId?: string, commitHash?: string): Promise<{ id: string; version: number }> {
  const db = requireDb();
  const files = await readAppFiles(projectId);
  const last = await db.appCheckpoint.findFirst({ where: { projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (last?.version ?? 0) + 1;
  const cp = await db.appCheckpoint.create({
    data: { projectId, version, message: message.slice(0, 300), files, commitHash: commitHash ?? null, createdById: actorId },
  });
  return { id: cp.id, version: cp.version };
}

export async function listCheckpoints(projectId: string) {
  const db = requireDb();
  const rows = await db.appCheckpoint.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    take: 50,
    select: { id: true, version: true, message: true, commitHash: true, createdAt: true, files: true },
  });
  return rows.map((r) => ({
    id: r.id,
    version: r.version,
    message: r.message,
    commitHash: r.commitHash,
    createdAt: r.createdAt.toISOString(),
    files: typeof r.files === "object" && r.files !== null ? Object.keys(r.files as Record<string, unknown>).length : 0,
  }));
}

export async function restoreCheckpoint(projectId: string, checkpointId: string, actorId: string): Promise<void> {
  const db = requireDb();
  const cp = await db.appCheckpoint.findFirst({ where: { id: checkpointId, projectId } });
  if (!cp) throw new NotFoundError("Checkpoint");
  const snapshot = cp.files as Record<string, string>;
  await restoreFiles(projectId, snapshot);
  await createCheckpoint(projectId, `Restored snapshot v${cp.version} — ${cp.message}`, actorId);
}

// ── Environment variables ───────────────────────────────────────────────────

export interface EnvVarRow {
  id: string;
  name: string;
  isSecret: boolean;
  /** masked view — never the real value for secrets */
  value: string;
}

export async function listEnvVars(projectId: string): Promise<EnvVarRow[]> {
  const db = requireDb();
  const rows = await db.environmentVariable.findMany({ where: { projectId }, orderBy: { name: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isSecret: r.isSecret,
    value: r.isSecret ? "••••••••••" : r.valueCipher ?? "",
  }));
}

export async function setEnvVar(projectId: string, name: string, value: string, isSecret: boolean): Promise<void> {
  const db = requireDb();
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(clean)) {
    throw new ValidationError("Env var name must be UPPER_SNAKE, e.g. DATABASE_URL");
  }
  const cipher = isSecret ? encryptSecret(value) : value;
  await db.environmentVariable.upsert({
    where: { projectId_name: { projectId, name: clean } },
    create: { projectId, name: clean, valueCipher: cipher, isSecret },
    update: { valueCipher: cipher, isSecret },
  });
}

export async function deleteEnvVar(projectId: string, name: string): Promise<void> {
  const db = requireDb();
  await db.environmentVariable.deleteMany({ where: { projectId, name } });
}

/** Decrypted map used ONLY server-side (written to the sandbox .env). */
export async function envVarMap(projectId: string): Promise<Record<string, string>> {
  const db = requireDb();
  const rows = await db.environmentVariable.findMany({ where: { projectId } });
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.valueCipher) out[r.name] = r.isSecret ? decryptSecret(r.valueCipher) : r.valueCipher;
  }
  return out;
}

export async function appWorkspaceMeta(projectId: string) {
  const db = requireDb();
  const [files, runs, checkpoints, envVars, project] = await Promise.all([
    db.appFile.count({ where: { projectId } }),
    db.appRun.count({ where: { projectId } }),
    db.appCheckpoint.count({ where: { projectId } }),
    db.environmentVariable.count({ where: { projectId } }),
    db.project.findUnique({ where: { id: projectId }, select: { name: true, status: true } }),
  ]);
  const lastRun = await db.appRun.findFirst({ where: { projectId }, orderBy: { startedAt: "desc" }, select: { status: true, steps: true, summary: true, startedAt: true } });
  const current = await readAppFiles(projectId);
  return {
    projectName: project?.name ?? null,
    appStatus: hasRealFiles(current) ? "ready" : "starter",
    fileCount: files,
    runCount: runs,
    checkpointCount: checkpoints,
    envVarCount: envVars,
    lastRun: lastRun
      ? {
          status: lastRun.status,
          steps: lastRun.steps as PipelineStep[] | null,
          summary: lastRun.summary,
          startedAt: lastRun.startedAt.toISOString(),
        }
      : null,
  };
}