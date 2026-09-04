import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="glass rounded-3xl p-7 text-center">
        <h1 className="font-display font-bold text-2xl text-white">Missing reset token</h1>
        <p className="text-sm text-zinc-500 mt-2">This link is incomplete. Request a new one below.</p>
        <Link href="/forgot-password" className="text-acc-soft text-sm hover:underline mt-4 inline-block">Request reset link</Link>
      </div>
    );
  }
  return <ResetForm token={token} />;
}
