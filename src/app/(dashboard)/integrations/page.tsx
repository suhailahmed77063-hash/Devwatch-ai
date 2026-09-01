import { db } from "@/lib/db";
import { repositories, webhookEvents, ciRuns, integrations as integrationsTable } from "@/lib/db/schema";
import { desc, eq, count } from "drizzle-orm";
import IntegrationsClient from "./integrations-client";

export default async function IntegrationsPage() {
  const orgId = "00000000-0000-0000-0000-000000000001";

  const [
    repos,
    totalWebhookEvents,
    recentEvents,
    ciStats,
    integrations,
  ] = await Promise.all([
    db.select().from(repositories).where(eq(repositories.orgId, orgId)),
    db.select({ count: count() }).from(webhookEvents),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(10),
    db.select({ status: ciRuns.status, count: count() }).from(ciRuns).groupBy(ciRuns.status),
    db.select().from(integrationsTable).where(eq(integrationsTable.orgId, orgId)),
  ]);

  const ciSuccess = ciStats.find(s => s.status === "success")?.count ?? 0;
  const ciTotal = ciStats.reduce((a, s) => a + (s.count ?? 0), 0);
  const ciRate = ciTotal > 0 ? Math.round((ciSuccess / ciTotal) * 100) : 0;

  return (
    <IntegrationsClient
      repos={repos}
      webhookEventCount={totalWebhookEvents[0]?.count ?? 0}
      recentEvents={recentEvents}
      ciRate={ciRate}
      ciTotal={ciTotal}
      integrations={integrations}
    />
  );
}
