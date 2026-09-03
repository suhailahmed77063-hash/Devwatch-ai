export const dynamic = "force-dynamic";

import { IncidentDetailClient } from "./incident-detail-client";

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <IncidentDetailClient params={params} />;
}
