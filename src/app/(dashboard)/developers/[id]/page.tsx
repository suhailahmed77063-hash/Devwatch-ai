import { db } from "@/lib/db";
import {
  developers,
  commits,
  pullRequests,
  codeFindings,
  tasks,
  projects,
  repositories,
} from "@/lib/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import DevDetailClient from "./dev-detail-client";

export const dynamic = "force-dynamic";

export default async function DeveloperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const devResult = await db.select().from(developers).where(eq(developers.id, id)).limit(1);
  const dev = devResult[0];

  if (!dev) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Developer not found</p>
      </div>
    );
  }

  const [totalCommits, totalPRs, openPRs, mergedPRs] = await Promise.all([
    db.select({ count: count() }).from(commits).where(eq(commits.developerId, id)),
    db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.developerId, id)),
    db.select({ count: count() }).from(pullRequests).where(and(eq(pullRequests.developerId, id), eq(pullRequests.state, "open"))),
    db.select({ count: count() }).from(pullRequests).where(and(eq(pullRequests.developerId, id), eq(pullRequests.state, "merged"))),
  ]);

  const recentCommits = await db
    .select()
    .from(commits)
    .where(eq(commits.developerId, id))
    .orderBy(desc(commits.committedAt))
    .limit(10);

  const recentPRs = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.developerId, id))
    .orderBy(desc(pullRequests.createdAt))
    .limit(10);

  const devData = {
    ...dev,
    totalCommits: totalCommits[0]?.count ?? 0,
    totalPRs: totalPRs[0]?.count ?? 0,
    openPRs: openPRs[0]?.count ?? 0,
    mergedPRs: mergedPRs[0]?.count ?? 0,
  };

  return (
    <DevDetailClient
      dev={devData}
      recentCommits={recentCommits}
      recentPRs={recentPRs}
    />
  );
}
