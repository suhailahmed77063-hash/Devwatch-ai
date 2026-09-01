import { db } from "@/lib/db";
import { developers } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import DevsClient from "./devs-client";

export default async function DevelopersPage() {
  const data = await db.select().from(developers).orderBy(desc(developers.createdAt));
  return <DevsClient developers={data} />;
}
