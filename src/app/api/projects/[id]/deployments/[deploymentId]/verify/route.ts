import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonOk, jsonError } from "@/lib/server/http";
import { optEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  try {
    const user = await requireUserOrThrow();
    const { id, deploymentId } = await params;
    await assertAccess(id, user.id, "VIEWER");

    const db = requireDb();
    const deployment = await db.deployment.findUnique({
      where: { id: deploymentId },
      select: {
        id: true,
        status: true,
        url: true,
        isPublished: true,
        artifact: true,
        createdAt: true,
        durationMs: true,
      },
    });

    if (!deployment) {
      return jsonOk({ verified: false, error: "Deployment not found" });
    }

    // Check if the deployment has an artifact
    const artifact = deployment.artifact as Record<string, string> | null;
    const hasArtifact = artifact && Object.keys(artifact).length > 0;
    const hasIndex = artifact?.index?.includes("<!doctype html>");

    // Check if the URL is accessible (if it has one)
    let isAccessible = false;
    if (deployment.url) {
      try {
        const res = await fetch(deployment.url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        isAccessible = res.ok;
      } catch {
        isAccessible = false;
      }
    }

    // For WebForge provider, check if the slug route would work
    const base = optEnv("WEBFORGE_APP_BASE") ?? "webforge.app";
    const project = await db.project.findUnique({
      where: { id },
      select: { slug: true },
    });
    const expectedUrl = project ? `https://${project.slug}.${base}` : null;

    return jsonOk({
      verified: true,
      deployment: {
        id: deployment.id,
        status: deployment.status,
        isPublished: deployment.isPublished,
        hasArtifact,
        hasValidHtml: hasIndex,
        url: deployment.url,
        expectedUrl,
        isAccessible,
        durationMs: deployment.durationMs,
        createdAt: deployment.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
