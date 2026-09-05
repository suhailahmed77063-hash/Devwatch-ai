"use client";

import { useEffect, useState } from "react";
import { Sparkles, Bot, Globe, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import Link from "next/link";

interface Credits {
  plan: string;
  usage: {
    month: string;
    aiGenerations: { used: number; limit: number; unlimited: boolean };
    appGenerations: { used: number; limit: number; unlimited: boolean };
    published: { used: number; limit: number; unlimited: boolean };
  };
}

export function CreditsBanner() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Credits>("/api/credits")
      .then(setCredits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-3 text-zinc-500">
        <Loader2 className="w-4 h-4 spin-slow" />
        <span className="text-xs">Loading credits…</span>
      </div>
    );
  }

  if (!credits || credits.plan !== "FREE") return null;

  const { aiGenerations, appGenerations, published } = credits.usage;
  const aiRemaining = aiGenerations.unlimited ? "∞" : Math.max(0, aiGenerations.limit - aiGenerations.used);
  const appRemaining = appGenerations.unlimited ? "∞" : Math.max(0, appGenerations.limit - appGenerations.used);
  const pubRemaining = published.unlimited ? "∞" : Math.max(0, published.limit - published.used);

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Free Plan Credits</h3>
        <Link href="/settings" className="text-[11px] text-acc-soft hover:underline font-medium">
          Upgrade to Pro →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <CreditItem
          icon={<Sparkles className="w-4 h-4" />}
          label="Website Generations"
          used={aiGenerations.used}
          limit={aiGenerations.limit}
          remaining={aiRemaining}
          unlimited={aiGenerations.unlimited}
        />
        <CreditItem
          icon={<Bot className="w-4 h-4" />}
          label="App Generations"
          used={appGenerations.used}
          limit={appGenerations.limit}
          remaining={appRemaining}
          unlimited={appGenerations.unlimited}
        />
        <CreditItem
          icon={<Globe className="w-4 h-4" />}
          label="Published Sites"
          used={published.used}
          limit={published.limit}
          remaining={pubRemaining}
          unlimited={published.unlimited}
        />
      </div>
    </div>
  );
}

function CreditItem({
  icon,
  label,
  used,
  limit,
  remaining,
  unlimited,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  remaining: number | string;
  unlimited: boolean;
}) {
  const pct = unlimited ? 0 : limit > 0 ? (used / limit) * 100 : 0;
  const exhausted = !unlimited && remaining === 0;

  return (
    <div className={`rounded-xl p-3 ${exhausted ? "bg-red-500/10 border border-red-500/20" : "bg-white/[.03]"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={exhausted ? "text-red-400" : "text-acc-soft"}>{icon}</span>
        <span className="text-[11px] font-medium text-zinc-300">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-display font-bold ${exhausted ? "text-red-400" : "text-white"}`}>
          {remaining}
        </span>
        {!unlimited && (
          <span className="text-[10px] text-zinc-600">/ {limit}</span>
        )}
      </div>
      {!unlimited && limit > 0 && (
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${exhausted ? "bg-red-500" : "bg-acc"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
