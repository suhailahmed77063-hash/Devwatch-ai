import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleAlert } from "lucide-react";
import { verifyEmail } from "@/lib/actions/auth";
import { toAppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  let message = "Invalid or missing verification token.";
  if (token) {
    try {
      const res = await verifyEmail(token);
      ok = res.ok;
      message = res.error ?? res.message ?? "Email verified.";
    } catch (e) {
      const app = toAppError(e);
      message = app.code === "CONFIG_ERROR" ? "The app database isn't configured yet — see the README to finish local setup, then re-open this link." : app.publicMessage;
    }
  }
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5 ${ok ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
        {ok ? <CircleCheck className="w-6 h-6 text-emerald-400" /> : <CircleAlert className="w-6 h-6 text-red-400" />}
      </div>
      <h1 className="font-display font-bold text-xl text-white">{ok ? "Email verified!" : "Verification failed"}</h1>
      <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{message}</p>
      {ok && (
        <Link href="/projects" className="btn-acc text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-block mt-6">
          Go to dashboard
        </Link>
      )}
    </div>
  );
}
