"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/lib/actions/members";

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    acceptInvitationAction(token).then((res) => {
      if (res.ok) {
        router.replace("/projects");
      } else {
        setError(res.error ?? "Could not accept the invitation.");
      }
    });
  }, [token, router]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-bold text-xl text-white">Invitation issue</h1>
        <p className="text-zinc-500 text-sm mt-2">{error}</p>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="skel h-10 w-10 rounded-2xl mx-auto" />
      <p className="text-zinc-400 text-sm mt-4">Accepting your invitation…</p>
    </div>
  );
}
