import { db } from "@/lib/db";
import {
  repositories,
  commits,
  pullRequests,
  securityFindings,
  vulnerabilities,
  ciRuns,
} from "@/lib/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import RepoDetailClient from "./repo-detail-client";

export const dynamic = "force-dynamic";

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch repo
  const repoResult = await db.select().from(repositories).where(eq(repositories.id, id)).limit(1);
  const repo = repoResult[0];

  if (!repo) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  // Fetch stats in parallel
  const [openPRs, mergedPRs, totalCommits, secIssues, vulns, ciRunsList] = await Promise.all([
    db.select({ count: count() }).from(pullRequests).where(and(eq(pullRequests.repoId, id), eq(pullRequests.state, "open"))),
    db.select({ count: count() }).from(pullRequests).where(and(eq(pullRequests.repoId, id), eq(pullRequests.state, "merged"))),
    db.select({ count: count() }).from(commits).where(eq(commits.repoId, id)),
    db.select({ count: count() }).from(securityFindings).where(eq(securityFindings.repoId, id)),
    db.select({ count: count() }).from(vulnerabilities).where(eq(vulnerabilities.repoId, id)),
    db.select().from(ciRuns).where(eq(ciRuns.repoId, id)).orderBy(desc(ciRuns.createdAt)).limit(10),
  ]);

  const ciSuccessCount = await db.select({ count: count() }).from(ciRuns).where(and(eq(ciRuns.repoId, id), eq(ciRuns.status, "success")));
  const totalCIRuns = await db.select({ count: count() }).from(ciRuns).where(eq(ciRuns.repoId, id));

  const ciSuccessRate = totalCIRuns[0]?.count > 0
    ? Math.round((ciSuccessCount[0]?.count || 0) / totalCIRuns[0].count * 100)
    : 0;

  // Fetch recent commits
  const recentCommits = await db
    .select()
    .from(commits)
    .where(eq(commits.repoId, id))
    .orderBy(desc(commits.committedAt))
    .limit(10);

  // Fetch recent PRs
  const recentPRs = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.repoId, id))
    .orderBy(desc(pullRequests.createdAt))
    .limit(10);

  // Fetch vulnerabilities
  const vulnList = await db
    .select()
    .from(vulnerabilities)
    .where(eq(vulnerabilities.repoId, id))
    .orderBy(desc(vulnerabilities.createdAt))
    .limit(10);

  // Fetch security findings
  const secList = await db
    .select()
    .from(securityFindings)
    .where(eq(securityFindings.repoId, id))
    .orderBy(desc(securityFindings.createdAt))
    .limit(10);

  const repoData = {
    ...repo,
    openPRs: openPRs[0]?.count ?? 0,
    mergedPRs: mergedPRs[0]?.count ?? 0,
    totalCommits: totalCommits[0]?.count ?? 0,
    securityIssues: secIssues[0]?.count ?? 0,
    vulnerabilities: vulns[0]?.count ?? 0,
    ciSuccessRate,
  };

  return (
    <RepoDetailClient
      repo={repoData}
      recentCommits={recentCommits}
      recentPRs={recentPRs}
      vulnerabilities={vulnList}
      securityFindings={secList}
      ciRuns={ciRunsList}
    />
  );
}
