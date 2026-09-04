import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonOk, jsonError } from "@/lib/server/http";
import { listCheckpoints, restoreCheckpoint } from "@/lib/server/app/data";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const checkpoints = await listCheckpoints(id);
    return jsonOk({ checkpoints });
  } catch (e) {
    return jsonError(e);
  }
}

const restoreSchema = z.object({ checkpointId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = restoreSchema.parse(await req.json());
    await restoreCheckpoint(projectId, body.checkpointId, user.id);
    await logAudit({ actorId: user.id, projectId, action: "app.checkpoint.restore", entity: "AppCheckpoint", entityId: body.checkpointId });
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

/** Diff two checkpoints (a & b ids) — returns added/removed/changed paths. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const body = z.object({ a: z.string().min(1), b: z.string().min(1) }).parse(await req.json());
    const db = requireDb();
    const [ca, cb] = await Promise.all([
      db.appCheckpoint.findFirst({ where: { id: body.a, projectId: id } }),
      db.appCheckpoint.findFirst({ where: { id: body.b, projectId: id } }),
    ]);
    if (!ca || !cb) return jsonError(new Error("Checkpoint not found"));

    const fa = ca.files as Record<string, string>;
    const fb = cb.files as Record<string, string>;
    const paths = new Set([...Object.keys(fa), ...Object.keys(fb)]);
    const diff: { path: string; change: "added" | "removed" | "modified" }[] = [];
    for (const p of paths) {
      if (!(p in fa)) diff.push({ path: p, change: "added" });
      else if (!(p in fb)) diff.push({ path: p, change: "removed" });
      else if (fa[p] !== fb[p]) diff.push({ path: p, change: "modified" });
    }
    return jsonOk({ diff, a: { version: ca.version, message: ca.message }, b: { version: cb.version, message: cb.message } });
  } catch (e) {
    return jsonError(e);
  }
}