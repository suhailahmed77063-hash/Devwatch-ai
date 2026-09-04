"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User as UserIcon, Shield, CreditCard, KeyRound, CircleCheck, Copy, Trash2, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { cn, timeAgo } from "@/lib/utils";
import { updateProfile, changePassword } from "@/lib/actions/auth";
import { checkoutAction, portalAction } from "@/lib/actions/billing";
import { createKeyAction, listKeysAction, revokeKeyAction } from "@/lib/actions/api-keys";
import type { DashboardUsage } from "@/lib/server/usage";

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Subscription", icon: CreditCard },
  { id: "api-keys", label: "API keys", icon: KeyRound },
];

export function SettingsClient({
  userName,
  userEmail,
  plan,
  verified,
  usage,
  billingConfigured,
}: {
  userName: string | null;
  userEmail: string | null;
  plan: string;
  verified: boolean;
  usage: DashboardUsage;
  billingConfigured: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as string) ?? "profile";
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<Awaited<ReturnType<typeof listKeysAction>> | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setKeys(await listKeysAction());
    } catch {
      setKeys([]);
    }
  }, []);
  useEffect(() => {
    if (tab === "api-keys") loadKeys();
  }, [tab, loadKeys]);

  const Panel = ({ children }: { children: React.ReactNode }) => (
    <div className="glass rounded-2xl p-6 mt-5 max-w-2xl">{children}</div>
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display font-bold text-3xl tracking-tight text-white">Settings</h1>
      <div className="flex gap-1.5 mt-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => router.replace(`/settings?tab=${t.id}`)}
            className={cn("wf-tab-btn shrink-0 text-sm font-medium px-4 py-2 rounded-xl border border-white/10 text-zinc-400 flex items-center gap-2", tab === t.id && "active")}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <Panel>
          <h2 className="font-display font-semibold text-lg text-white">Profile</h2>
          <p className="text-sm text-zinc-500 mt-1">How you appear across WebForge.</p>
          <form
            className="space-y-4 mt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const data = new FormData(e.currentTarget);
              const res = await updateProfile({ name: String(data.get("name") ?? "") });
              setBusy(false);
              if (!res.ok) {
                toast(res.error ?? "Could not update profile", "error");
              } else {
                toast("Profile updated");
                router.refresh();
              }
            }}
          >
            <Field label="Name">
              <Input name="name" defaultValue={userName ?? ""} required maxLength={80} />
            </Field>
            <Field label="Email">
              <Input value={userEmail ?? ""} disabled />
            </Field>
            <div className="flex items-center gap-2">
              <StatusPill tone={verified ? "green" : "amber"}>{verified ? "Email verified" : "Email not verified"}</StatusPill>
              {!verified && (
                <a href="/verify-email" className="text-xs text-acc-soft hover:underline">Resend confirmation</a>
              )}
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </form>
        </Panel>
      )}

      {tab === "security" && (
        <Panel>
          <h2 className="font-display font-semibold text-lg text-white">Security</h2>
          <p className="text-sm text-zinc-500 mt-1">Change your password.</p>
          <form
            className="space-y-4 mt-5 max-w-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const data = new FormData(e.currentTarget);
              const res = await changePassword({
                currentPassword: String(data.get("current") ?? ""),
                newPassword: String(data.get("new") ?? ""),
              });
              setBusy(false);
              if (!res.ok) {
                toast(res.error ?? "Could not change password", "error");
                return;
              }
              toast("Password changed");
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            <Field label="Current password">
              <Input name="current" type="password" required autoComplete="current-password" />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <Input name="new" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </form>
        </Panel>
      )}

      {tab === "billing" && (
        <Panel>
          <h2 className="font-display font-semibold text-lg text-white">Subscription</h2>
          <div className="flex items-center gap-3 mt-4">
            <StatusPill tone={plan === "FREE" ? "zinc" : "rose"}>{plan} plan</StatusPill>
            {!billingConfigured && <span className="text-[11px] text-amber-400">Payments not configured on this deployment (set STRIPE_SECRET_KEY).</span>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <div className="glass rounded-xl p-4">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider">AI generations · {usage.month}</div>
              <div className="text-2xl font-display font-bold text-white mt-1">
                {usage.aiGenerations.unlimited ? "∞" : `${usage.aiGenerations.used} / ${usage.aiGenerations.limit}`}
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Published projects</div>
              <div className="text-2xl font-display font-bold text-white mt-1">
                {usage.published.unlimited ? "∞" : `${usage.published.used} / ${usage.published.limit}`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {plan === "FREE" && (
              <Button
                disabled={busy || !billingConfigured}
                onClick={async () => {
                  setBusy(true);
                  const res = await checkoutAction("PRO");
                  setBusy(false);
                  if (!res.ok || !res.url) {
                    toast(res.error ?? "Checkout unavailable", "error");
                    return;
                  }
                  window.location.href = res.url;
                }}
              >
                <CreditCard className="w-4 h-4" /> Upgrade to Pro — $24/mo
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy || !billingConfigured}
              onClick={async () => {
                setBusy(true);
                const res = await portalAction();
                setBusy(false);
                if (!res.ok || !res.url) {
                  toast(res.error ?? "Customer portal unavailable", "error");
                  return;
                }
                window.location.href = res.url;
              }}
            >
              <ExternalLink className="w-4 h-4" /> Manage billing (Stripe portal)
            </Button>
          </div>
          <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
            Pro unlocks unlimited AI generations, 10 published projects, custom domains, AI images, advanced SEO and code export.
            Enterprise adds team seats, SSO and audit logs — email sales@webforge.app.
          </p>
        </Panel>
      )}

      {tab === "api-keys" && <ApiKeysPane keys={keys} onChanged={loadKeys} />}
    </div>
  );
}

function ApiKeysPane({ keys, onChanged }: { keys: Awaited<ReturnType<typeof listKeysAction>> | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<{ plain: string; name: string } | null>(null);
  const create = async () => {
    setBusy(true);
    const name = window.prompt("Name this key (e.g. CI, staging)") ?? "API key";
    const res = await createKeyAction(name);
    setBusy(false);
    if (!res.ok || !res.key) {
      toast(res.error ?? "Could not create the key", "error");
      return;
    }
    setFresh({ plain: res.key.plain, name });
    onChanged();
  };
  return (
    <div className="glass rounded-2xl p-6 mt-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg text-white">API keys</h2>
          <p className="text-sm text-zinc-500 mt-1">Authenticate server-side calls to the WebForge REST API.</p>
        </div>
        <Button onClick={create} disabled={busy} size="sm">
          <KeyRound className="w-3.5 h-3.5" /> New key
        </Button>
      </div>

      {fresh && (
        <div className="mt-5 glass rounded-xl border-emerald-500/25 p-4">
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <CircleCheck className="w-3.5 h-3.5" /> Key created — copy it now, it won&apos;t be shown again
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-xs text-acc-soft break-all">{fresh.plain}</code>
            <Button variant="subtle" size="iconSm" onClick={() => { navigator.clipboard?.writeText(fresh.plain); toast("Key copied"); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="iconSm" onClick={() => setFresh(null)}>✕</Button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {keys === null && <div className="skel h-10 rounded-lg" />}
        {keys?.map((k) => (
          <div key={k.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-zinc-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{k.name}</div>
              <div className="text-[11px] text-zinc-600 font-mono">
                {k.prefix}… · {k.lastUsedAt ? `last used ${timeAgo(k.lastUsedAt)}` : "never used"}
              </div>
            </div>
            <StatusPill tone={k.status === "ACTIVE" ? "green" : "zinc"}>{k.status.toLowerCase()}</StatusPill>
            {k.status === "ACTIVE" && (
              <button
                aria-label="Revoke key"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                onClick={async () => {
                  const res = await revokeKeyAction(k.id);
                  if (!res.ok) {
                    toast(res.error ?? "Could not revoke", "error");
                  } else {
                    toast("Key revoked");
                  }
                  onChanged();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {keys !== null && keys.length === 0 && <p className="text-xs text-zinc-600 py-3 text-center">No API keys yet.</p>}
      </div>
    </div>
  );
}
