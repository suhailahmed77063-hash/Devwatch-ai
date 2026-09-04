import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { assertPlanAllowed } from "@/lib/server/usage";
import { runDeployment } from "@/lib/server/deploy/run";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "VIEWER");
    const db = requireDb();
    const deployments = await db.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { logs: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    return jsonOk({ deployments });
  } catch (e) {
    return jsonError(e);
  }
}

const schema = z.object({
  message: z.string().max(120).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = schema.parse(await req.json());

    await assertPlanAllowed("DEPLOYMENT", { user, projectId });
    const db = requireDb();
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

    const result = await runDeployment({ project, actor: { id: user.id, plan: user.plan }, message: body.message ?? "Publish" });
    const deployment = await db.deployment.findUniqueOrThrow({
      where: { id: result.id },
      include: { logs: { orderBy: { createdAt: "asc" } } },
    });
    return jsonOk({ deployment });
  } catch (e) {
    return jsonError(e);
  }
}
