import { db } from "@/lib/db";
import { alerts, repositories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import AlertsClient from "./alerts-client";

export default async function AlertsPage() {
  const data = await db
    .select({
      id: alerts.id,
      title: alerts.title,
      message: alerts.message,
      severity: alerts.severity,
      isRead: alerts.isRead,
      createdAt: alerts.createdAt,
      repoName: repositories.name,
    })
    .from(alerts)
    .leftJoin(repositories, eq(alerts.repoId, repositories.id))
    .orderBy(desc(alerts.createdAt))
    .limit(50);

  return <AlertsClient alerts={data} />;
}
