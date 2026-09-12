import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { FindingDetailClient } from "./detail-client";

export const metadata: Metadata = { title: "Security Finding" };
export const dynamic = "force-dynamic";

export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <FindingDetailClient findingId={id} />;
}
