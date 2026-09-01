import { db } from "@/lib/db";
import { pullRequests, repositories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import PRsClient from "./prs-client";

export default async function PullRequestsPage() {
  const data = await db
    .select({
      id: pullRequests.id,
      number: pullRequests.number,
      title: pullRequests.title,
      state: pullRequests.state,
      branch: pullRequests.branch,
      baseBranch: pullRequests.baseBranch,
      additions: pullRequests.additions,
      deletions: pullRequests.deletions,
      changedFiles: pullRequests.changedFiles,
      riskScore: pullRequests.riskScore,
      ciStatus: pullRequests.ciStatus,
      createdAt: pullRequests.createdAt,
      repoName: repositories.name,
    })
    .from(pullRequests)
    .leftJoin(repositories, eq(pullRequests.repoId, repositories.id))
    .orderBy(desc(pullRequests.createdAt));

  return <PRsClient pullRequests={data} />;
}
