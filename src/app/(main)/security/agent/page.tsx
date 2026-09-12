import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { SecurityAgentClient } from "./agent-client";

export const metadata: Metadata = { title: "Security Agent" };
export const dynamic = "force-dynamic";

export default async function SecurityAgentPage() {
  await requireUser();
  return <SecurityAgentClient />;
}
