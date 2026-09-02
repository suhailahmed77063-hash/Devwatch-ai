export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import ProjectsClient from "./projects-client";

export default async function ProjectsPage() {
  const data = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return <ProjectsClient projects={data} />;
}
