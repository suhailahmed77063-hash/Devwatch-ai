"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, CircleAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { registerUser, requestPasswordReset, resetPassword } from "@/lib/actions/auth";

export function OAuthButtons({ next, google, github }: { next?: string; google?: boolean; github?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const go = (provider: "google" | "github") => {
    setBusy(provider);
    signIn(provider, { callbackUrl: next || "/projects" });
  };
  if (!google && !github) return null;
  return (
    <div className="space-y-2.5">
      {google && (
        <Button type="button" variant="outline" className="w-full" onClick={() => go("google")} disabled={Boolean(busy)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </Button>
      )}
      {github && (
        <Button type="button" variant="outline" className="w-full" onClick={() => go("github")} disabled={Boolean(busy)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.77 1.05.77 2.12v3.14c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          Continue with GitHub
        </Button>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
      <div className="relative flex justify-center"><span className="bg-panel px-3 text-[11px] text-zinc-600 uppercase tracking-widest">or</span></div>
    </div>
  );
}

export function LoginForm({ next, google, github }: { next?: string; google?: boolean; github?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await signIn("credentials", {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        setBusy(false);
        return;
      }
      router.replace(next || "/projects");
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-7">
      <h1 className="font-display font-bold text-2xl text-white">Welcome back</h1>
      <p className="text-sm text-zinc-500 mt-1">Sign in to keep building.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5">
            <CircleAlert className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </Field>
        <Field label="Password" hint={<a className="text-acc-soft hover:underline float-right -mt-6" href="/forgot-password">Forgot password?</a>}>
          <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
      <OAuthButtons next={next} google={google} github={github} />
      <p className="text-center text-xs text-zinc-500 mt-5">
        New to WebForge?{" "}
        <a className="text-acc-soft hover:underline font-semibold" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>
          Create an account
        </a>
      </p>
    </div>
  );
}

export function SignupForm({ next, google, github }: { next?: string; google?: boolean; github?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const res = await registerUser({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create your account.");
      return;
    }
    setOk(res.message ?? "Account created");
    toast("Account created — welcome to WebForge AI!");
    router.replace(next || "/projects");
    router.refresh();
  };

  return (
    <div className="glass rounded-3xl p-7">
      <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
        Create your account <Sparkles className="w-5 h-5 text-acc-soft" />
      </h1>
      <p className="text-sm text-zinc-500 mt-1">Free plan — no credit card required.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5">
            <CircleAlert className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {ok && <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-2.5">{ok}</div>}
        <Field label="Name">
          <Input name="name" required autoComplete="name" placeholder="Ada Lovelace" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Start building"} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
      <OAuthButtons next={next} google={google} github={github} />
      <p className="text-center text-xs text-zinc-500 mt-5">
        Already have an account?{" "}
        <a className="text-acc-soft hover:underline font-semibold" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
          Sign in
        </a>
      </p>
    </div>
  );
}

export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    await requestPasswordReset(String(data.get("email") ?? ""));
    setBusy(false);
    setSent(true);
  };
  if (sent) {
    return (
      <div className="glass rounded-3xl p-7 text-center">
        <h1 className="font-display font-bold text-2xl text-white">Check your inbox</h1>
        <p className="text-sm text-zinc-500 mt-2">If that account exists, a password reset link is on its way.</p>
        <a className="text-acc-soft text-sm hover:underline mt-4 inline-block" href="/login">Back to sign in</a>
      </div>
    );
  }
  return (
    <div className="glass rounded-3xl p-7">
      <h1 className="font-display font-bold text-2xl text-white">Reset your password</h1>
      <p className="text-sm text-zinc-500 mt-1">We&apos;ll email you a secure reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@company.com" />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
      </form>
      <a className="text-acc-soft text-xs hover:underline mt-4 inline-block" href="/login">Back to sign in</a>
    </div>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const pw = String(data.get("password") ?? "");
    if (pw !== String(data.get("confirm") ?? "")) {
      setError("Passwords don't match.");
      setBusy(false);
      return;
    }
    const res = await resetPassword(token, pw);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not reset password.");
      return;
    }
    setDone(true);
    toast("Password updated — sign in with your new password.");
    window.location.href = "/login";
  };
  return (
    <div className="glass rounded-3xl p-7">
      <h1 className="font-display font-bold text-2xl text-white">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5"><CircleAlert className="w-4 h-4 shrink-0" /> {error}</div>}
        {done && <div className="text-xs text-emerald-400">Password updated — redirecting…</div>}
        <Field label="New password" hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </div>
  );
}
