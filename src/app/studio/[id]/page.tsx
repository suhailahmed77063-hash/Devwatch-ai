import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { roleOnProject } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { normalizeWebsite } from "@/lib/website/schema";
import { toAppError } from "@/lib/errors";
import { StudioClient } from "@/components/studio/studio-client";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prompt?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { prompt } = await searchParams;

  try {
    const db = requireDb();
    const project = await db.project.findUnique({
      where: { id },
      include: { currentVersion: { select: { version: true } } },
    });
    if (!project) {
      return <Missing kind="notfound" />;
    }
    const role = await roleOnProject(id, user.id);
    if (!role) return <Missing kind="forbidden" />;

    const doc = project.currentSchema ? normalizeWebsite(project.currentSchema) : null;

    return (
      <StudioClient
        project={{
          id: project.id,
          name: project.name,
          slug: project.slug,
          role,
          plan: user.plan,
          version: project.currentVersion?.version ?? 0,
        }}
        initialDoc={doc ? (JSON.parse(JSON.stringify(doc)) as never) : null}
        initialPrompt={prompt ?? null}
      />
    );
  } catch (e) {
    const app = toAppError(e);
    if (app.code === "CONFIG_ERROR") {
      return <Missing kind="config" message={app.publicMessage} />;
    }
    return <Missing kind="error" message={app.publicMessage} />;
  }
}

function Missing({ kind, message }: { kind: "notfound" | "forbidden" | "error" | "config"; message?: string }) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-5">
      <div className="glass rounded-3xl p-10 max-w-md text-center">
        <h1 className="font-display font-bold text-2xl text-white">
          {kind === "notfound" ? "Project not found" : kind === "forbidden" ? "No access" : "Studio unavailable"}
        </h1>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          {kind === "forbidden"
            ? "You don't have access to this project. Ask its owner for an invitation."
            : message ?? "The project could not be opened right now."}
        </p>
        <a href="/projects" className="btn-acc text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-block mt-6">
          Back to projects
        </a>
      </div>
    </div>
  );
}
