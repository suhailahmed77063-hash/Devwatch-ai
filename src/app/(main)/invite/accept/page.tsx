import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { acceptInvitationAction } from "@/lib/actions/members";
import { AcceptInviteClient } from "./accept-client";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await requireUser();
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="text-zinc-500 text-sm">This invitation link is missing its token.</p>
      </div>
    );
  }
  return <AcceptInviteClient token={token} />;
}
