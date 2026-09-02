export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { releases, organizations, deploymentEvents, rollbackRecommendations, releaseRisks, repositories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ReleasesClient from "./releases-client";

export default async function ReleasesPage() {
  // Get first organization
  const org = await db.select().from(organizations).limit(1);
  const orgId = org[0]?.id;

  let releaseList: any[] = [];
  let latestRelease: any = null;
  let recentDeployments: any[] = [];
  let recentRollbacks: any[] = [];

  if (orgId) {
    // Get all releases
    releaseList = await db
      .select()
      .from(releases)
      .where(eq(releases.orgId, orgId))
      .orderBy(desc(releases.createdAt))
      .limit(20);

    // Get latest release with full details
    if (releaseList.length > 0) {
      latestRelease = releaseList[0];

      // Get risks for latest release
      const risks = await db
        .select()
        .from(releaseRisks)
        .where(eq(releaseRisks.releaseId, latestRelease.id));
      latestRelease._risks = risks;
    }

    // Get recent deployments
    recentDeployments = await db
      .select()
      .from(deploymentEvents)
      .orderBy(desc(deploymentEvents.createdAt))
      .limit(10);

    // Get recent rollbacks
    recentRollbacks = await db
      .select()
      .from(rollbackRecommendations)
      .orderBy(desc(rollbackRecommendations.createdAt))
      .limit(5);
  }

  // Get repos for context
  const repos = orgId
    ? await db.select().from(repositories).where(eq(repositories.orgId, orgId))
    : [];

  return (
    <ReleasesClient
      releases={releaseList}
      latestRelease={latestRelease}
      recentDeployments={recentDeployments}
      recentRollbacks={recentRollbacks}
      repos={repos}
      orgId={orgId || ""}
    />
  );
}
