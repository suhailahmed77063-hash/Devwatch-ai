import { db } from "@/lib/db";
import { releases, organizations, deploymentEvents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ReleaseHistoryClient from "./release-history-client";

export default async function ReleaseHistoryPage() {
  const org = await db.select().from(organizations).limit(1);
  const orgId = org[0]?.id;

  let releaseList: any[] = [];
  let allDeployments: any[] = [];

  if (orgId) {
    releaseList = await db
      .select()
      .from(releases)
      .where(eq(releases.orgId, orgId))
      .orderBy(desc(releases.createdAt))
      .limit(50);

    allDeployments = await db
      .select()
      .from(deploymentEvents)
      .orderBy(desc(deploymentEvents.createdAt))
      .limit(50);
  }

  return (
    <ReleaseHistoryClient
      releases={releaseList}
      deployments={allDeployments}
    />
  );
}
