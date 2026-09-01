import { db } from "@/lib/db";
import { vulnerabilities } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import VulnsClient from "./vulns-client";

export default async function VulnerabilitiesPage() {
  const data = await db.select().from(vulnerabilities).orderBy(desc(vulnerabilities.createdAt));
  return <VulnsClient vulnerabilities={data} />;
}
