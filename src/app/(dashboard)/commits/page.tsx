import { db } from "@/lib/db";
import { commits, repositories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import CommitsClient from "./commits-client";

export default async function CommitsPage() {
  const data = await db
    .select({
      id: commits.id,
      sha: commits.sha,
      message: commits.message,
      branch: commits.branch,
      additions: commits.additions,
      deletions: commits.deletions,
      committedAt: commits.committedAt,
      repoName: repositories.name,
    })
    .from(commits)
    .leftJoin(repositories, eq(commits.repoId, repositories.id))
    .orderBy(desc(commits.committedAt))
    .limit(50);

  return <CommitsClient commits={data} />;
}
