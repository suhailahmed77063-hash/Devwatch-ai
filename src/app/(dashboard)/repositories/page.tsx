import { db } from "@/lib/db";
import { repositories, pullRequests, securityFindings } from "@/lib/db/schema";
import { desc, eq, count } from "drizzle-orm";
import ReposClient from "./repos-client";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  const repos = await db.select().from(repositories).orderBy(desc(repositories.updatedAt));

  const reposWithStats = await Promise.all(
    repos.map(async (repo) => {
      const prCount = await db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.repoId, repo.id));
      const secCount = await db.select({ count: count() }).from(securityFindings).where(eq(securityFindings.repoId, repo.id));
      return {
        ...repo,
        openPRs: prCount[0]?.count ?? 0,
        securityIssues: secCount[0]?.count ?? 0,
      };
    })
  );

  return <ReposClient repositories={reposWithStats} />;
}
