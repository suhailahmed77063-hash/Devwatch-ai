import { notFound } from "next/navigation";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Serves the generated app as a live preview.
 * Reads the deployed artifact from the database.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();

  const project = await db.project.findUnique({
    where: { id },
    select: {
      deployments: {
        where: { status: "READY", isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { artifact: true },
      },
    },
  });

  const artifact = project?.deployments[0]?.artifact as Record<string, string> | null;

  if (!artifact?.index) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head><title>No Preview</title></head>
<body style="background:#0a0a0c;color:#9ca3af;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
  <div style="text-align:center">
    <h2 style="color:#e5e7eb">No preview available</h2>
    <p>Generate and deploy your app to see a live preview.</p>
  </div>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response(artifact.index, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
