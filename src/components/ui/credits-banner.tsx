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

  if (!credits) return null;

  const { aiGenerations, appGenerations, published } = credits.usage;
  const aiRemaining = "∞";
  const appRemaining = "∞";
  const pubRemaining = "∞";

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">✨ Everything is FREE & Unlimited</h3>
        <span className="text-[11px] text-emerald-400 font-medium">
          No credit limits
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <CreditItem
          icon={<Sparkles className="w-4 h-4" />}
          label="Website Generations"
        />
        <CreditItem
          icon={<Bot className="w-4 h-4" />}
          label="App Generations"
        />
        <CreditItem
          icon={<Globe className="w-4 h-4" />}
          label="Published Sites"
        />
      </div>
    </div>
  );
}

function CreditItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-emerald-400">{icon}</span>
        <span className="text-[11px] font-medium text-zinc-300">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold text-emerald-400">
          ∞
        </span>
        <span className="text-[10px] text-emerald-400">Unlimited</span>
      </div>
    </div>
  );
}
