import { db } from "@/lib/db";
import {
  projects,
  tasks,
  milestones,
  projectRepositories,
  repositories,
  pullRequests,
  commits,
  developers,
} from "@/lib/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import ProjectDetailClient from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectResult = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const project = projectResult[0];

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // Fetch related data
  const [projectTasks, projectMilestones, projectRepos] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, id)).orderBy(desc(tasks.createdAt)),
    db.select().from(milestones).where(eq(milestones.projectId, id)).orderBy(desc(milestones.createdAt)),
    db.select({ repoId: projectRepositories.repoId }).from(projectRepositories).where(eq(projectRepositories.projectId, id)),
  ]);

  // Fetch lead developer name
  let leadName = "Unassigned";
  if (project.leadId) {
    const leadResult = await db.select().from(developers).where(eq(developers.id, project.leadId)).limit(1);
    leadName = leadResult[0]?.githubUsername || leadResult[0]?.name || "Unknown";
  }

  // Calculate days left
  const daysLeft = project.deadline
    ? Math.max(0, Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const projectData = {
    ...project,
    leadName,
    daysLeft,
    totalTasks: projectTasks.length,
    doneTasks: projectTasks.filter((t) => t.status === "done").length,
    inProgressTasks: projectTasks.filter((t) => t.status === "in_progress").length,
  };

  return (
    <ProjectDetailClient
      project={projectData}
      tasks={projectTasks}
      milestonesList={projectMilestones}
    />
  );
}
