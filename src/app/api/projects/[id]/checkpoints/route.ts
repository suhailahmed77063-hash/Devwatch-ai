import { NextRequest, NextResponse } from "next/server";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { listCheckpoints, restoreCheckpoint, createCheckpoint, readAppFiles } from "@/lib/server/app/data";
import { logAudit } from "@/lib/server/audit";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

/** GET /api/projects/:id/checkpoints — list all checkpoints */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "VIEWER");
    const checkpoints = await listCheckpoints(projectId);
    return NextResponse.json({ checkpoints });
  } catch (e) {
    logger.error("checkpoints.list.error", { error: (e as Error).message });
    return NextResponse.json({ error: "Failed to list checkpoints" }, { status: 500 });
  }
}

/** POST /api/projects/:id/checkpoints — restore, create, compare, or diff */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const db = requireDb();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "restore") {
      const { checkpointId } = body;
      if (!checkpointId) return NextResponse.json({ error: "checkpointId required" }, { status: 400 });
      await restoreCheckpoint(projectId, checkpointId, user.id);
      await logAudit({ actorId: user.id, projectId, action: "checkpoint.restore", entity: "AppCheckpoint", entityId: checkpointId });
      return NextResponse.json({ success: true, message: "Checkpoint restored successfully" });
    }

    if (action === "create") {
      const { message } = body;
      const cp = await createCheckpoint(projectId, message || "Manual checkpoint", user.id);
      await logAudit({ actorId: user.id, projectId, action: "checkpoint.create", entity: "AppCheckpoint", entityId: cp.id });
      return NextResponse.json({ success: true, checkpoint: cp });
    }

    if (action === "compare") {
      const { checkpointIdA, checkpointIdB } = body;
      if (!checkpointIdA || !checkpointIdB) {
        return NextResponse.json({ error: "Both checkpointIdA and checkpointIdB required" }, { status: 400 });
      }
      const [cpA, cpB] = await Promise.all([
        db.appCheckpoint.findFirst({ where: { id: checkpointIdA, projectId } }),
        db.appCheckpoint.findFirst({ where: { id: checkpointIdB, projectId } }),
      ]);
      if (!cpA || !cpB) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });

      const filesA = (cpA.files as Record<string, string>) ?? {};
      const filesB = (cpB.files as Record<string, string>) ?? {};
      const allPaths = new Set([...Object.keys(filesA), ...Object.keys(filesB)]);
      const diff: { path: string; status: "added" | "removed" | "modified" | "unchanged" }[] = [];
      for (const p of allPaths) {
        const inA = p in filesA;
        const inB = p in filesB;
        if (inA && !inB) diff.push({ path: p, status: "removed" });
        else if (!inA && inB) diff.push({ path: p, status: "added" });
        else if (filesA[p] !== filesB[p]) diff.push({ path: p, status: "modified" });
        else diff.push({ path: p, status: "unchanged" });
      }

      return NextResponse.json({
        checkpointA: { id: cpA.id, version: cpA.version, message: cpA.message, createdAt: cpA.createdAt },
        checkpointB: { id: cpB.id, version: cpB.version, message: cpB.message, createdAt: cpB.createdAt },
        diff: diff.sort((a, b) => a.path.localeCompare(b.path)),
        stats: {
          total: diff.length,
          added: diff.filter(d => d.status === "added").length,
          removed: diff.filter(d => d.status === "removed").length,
          modified: diff.filter(d => d.status === "modified").length,
          unchanged: diff.filter(d => d.status === "unchanged").length,
        },
      });
    }

    if (action === "diff") {
      const { checkpointId } = body;
      if (!checkpointId) return NextResponse.json({ error: "checkpointId required" }, { status: 400 });
      const cp = await db.appCheckpoint.findFirst({ where: { id: checkpointId, projectId } });
      if (!cp) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });

      const currentFiles = await readAppFiles(projectId);
      const snapshotFiles = (cp.files as Record<string, string>) ?? {};
      const allPaths = new Set([...Object.keys(currentFiles), ...Object.keys(snapshotFiles)]);
      const changes: { path: string; status: "added" | "removed" | "modified"; oldContent?: string; newContent?: string }[] = [];

      for (const p of allPaths) {
        const inCurrent = p in currentFiles;
        const inSnapshot = p in snapshotFiles;
        if (inSnapshot && !inCurrent) changes.push({ path: p, status: "removed", oldContent: snapshotFiles[p] });
        else if (!inSnapshot && inCurrent) changes.push({ path: p, status: "added", newContent: currentFiles[p] });
        else if (snapshotFiles[p] !== currentFiles[p]) {
          changes.push({ path: p, status: "modified", oldContent: snapshotFiles[p], newContent: currentFiles[p] });
        }
      }

      return NextResponse.json({
        checkpoint: { id: cp.id, version: cp.version, message: cp.message, createdAt: cp.createdAt },
        changes: changes.sort((a, b) => a.path.localeCompare(b.path)),
        stats: {
          total: changes.length,
          added: changes.filter(c => c.status === "added").length,
          removed: changes.filter(c => c.status === "removed").length,
          modified: changes.filter(c => c.status === "modified").length,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action. Use: restore, create, compare, diff" }, { status: 400 });
  } catch (e) {
    logger.error("checkpoints.error", { error: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message || "Checkpoint operation failed" }, { status: 500 });
  }
}
