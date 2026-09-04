import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { listProjectsForUser } from "@/lib/server/data/projects";
import { toAppError } from "@/lib/errors";
import { ProjectsClient } from "./projects-client";

export const metadata: Metadata = { title: "Projects" };

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const user = await requireUser();
  const { archived } = await searchParams;
  let items: Awaited<ReturnType<typeof listProjectsForUser>> = [];
  let error: string | null = null;
  try {
    items = await listProjectsForUser(user.id, { includeArchived: Boolean(archived) });
  } catch (e) {
    error = toAppError(e).publicMessage;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-bold text-2xl text-white">Projects</h1>
        <p className="text-zinc-500 mt-3 max-w-md mx-auto leading-relaxed text-sm">{error}</p>
      </div>
    );
  }

  return <ProjectsClient initial={items} showArchived={Boolean(archived)} />;
}
