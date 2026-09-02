import { db } from "@/lib/db";
import {
  pullRequests,
  pullRequestReviews,
  codeFindings,
  securityFindings,
  repositories,
  developers,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import PRDetailClient from "./pr-detail-client";

export const dynamic = "force-dynamic";

export default async function PRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch PR
  const prResult = await db.select().from(pullRequests).where(eq(pullRequests.id, id)).limit(1);
  const pr = prResult[0];

  if (!pr) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Pull request not found</p>
      </div>
    );
  }

  // Fetch related data
  const [reviews, codeIssues, secFindings] = await Promise.all([
    db.select().from(pullRequestReviews).where(eq(pullRequestReviews.prId, id)).orderBy(desc(pullRequestReviews.submittedAt)),
    db.select().from(codeFindings).where(eq(codeFindings.prId, id)).orderBy(desc(codeFindings.createdAt)),
    db.select().from(securityFindings).where(eq(securityFindings.prId, id)).orderBy(desc(securityFindings.createdAt)),
  ]);

  // Fetch repo name
  const repoResult = await db.select().from(repositories).where(eq(repositories.id, pr.repoId)).limit(1);

  // Fetch developer name
  let developerName = "Unknown";
  if (pr.developerId) {
    const devResult = await db.select().from(developers).where(eq(developers.id, pr.developerId)).limit(1);
    developerName = devResult[0]?.githubUsername || devResult[0]?.name || "Unknown";
  }

  const prData = {
    ...pr,
    repoName: repoResult[0]?.name || "Unknown",
    developerName,
  };

  return (
    <PRDetailClient
      pr={prData}
      reviews={reviews}
      codeFindings={codeIssues}
      securityFindings={secFindings}
    />
  );
}
