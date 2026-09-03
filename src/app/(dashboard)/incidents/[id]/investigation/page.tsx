export const dynamic = "force-dynamic";

import { InvestigationChatClient } from "./investigation-chat-client";

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  return <InvestigationChatClient params={params} />;
}
