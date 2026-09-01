import { db } from "@/lib/db";
import { securityFindings } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import SecurityClient from "./security-client";

export default async function SecurityPage() {
  const data = await db.select().from(securityFindings).orderBy(desc(securityFindings.createdAt));
  return <SecurityClient findings={data} />;
}
