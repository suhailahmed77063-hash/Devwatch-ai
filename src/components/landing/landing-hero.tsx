"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Paperclip, Sparkles, CircleCheck, Lock } from "lucide-react";
import { buildTemplateSite } from "@/lib/templates/catalog";
import { SitePageView } from "@/components/preview/renderer";

const EXAMPLES = [
  "SaaS landing page for a fintech startup",
  "Portfolio for a photographer with gallery",
  "Online store for handmade jewelry",
  "Restaurant site with menu & reservations",
];

export function LandingHero() {
  const router = useRouter();
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const site = buildTemplateSite("SaaS");

  const go = (value?: string) => {
    const q = (value ?? prompt ?? "").trim();
    const params = new URLSearchParams();
    if (q) params.set("prompt", q);
    const qs = params.toString() ? `?${params.toString()}` : "";
    if (session?.user) router.push(`/projects/new${qs}`);
    else router.push(`/login?next=${encodeURIComponent(`/projects/new${qs}`)}`);
  };

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="hero-grid-bg absolute inset-0" />
      <div className="hero-blob w-[480px] h-[480px] -top-32 -left-32" style={{ background: "#dc143c" }} />
      <div className="hero-blob w-[420px] h-[420px] top-40 -right-32" style={{ background: "#7f1d1d" }} />

      <div className="relative max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
        {/* LEFT */}
        <div className="fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-zinc-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-acc animate-pulse" /> WebForge v2.0 — now with autonomous AI editing
          </div>
          <h1 className="font-display font-bold tracking-tight text-5xl md:text-6xl xl:text-7xl leading-[1.04] text-white">
            Build Websites
            <br />
            <span className="grad-text">With AI</span>
          </h1>
          <p className="mt-5 text-zinc-400 text-lg max-w-lg">Describe your idea. Let AI design, code, and launch your website in minutes.</p>

          {/* PROMPT BOX */}
          <div className="glow-wrap mt-8 max-w-xl">
            <div className="glow-inner bg-[#0c0c0f] border border-white/10 p-4">
              <label htmlFor="heroPrompt" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                What do you want to build?
              </label>
              <textarea
                id="heroPrompt"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create a modern portfolio website for a software engineer with a dark theme, project showcase, skills section and contact form."
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder-zinc-600 mt-2 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  aria-label="Attach files later"
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
                  onClick={() => go()}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go()}
                  className="btn-acc text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate Website
                </button>
              </div>
            </div>
          </div>

          {/* EXAMPLE PROMPTS */}
          <div className="mt-5 flex flex-wrap gap-2 max-w-xl">
            <span className="text-[11px] text-zinc-500 w-full mb-1">Try an example:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="chip glass rounded-full px-3.5 py-1.5 text-xs text-zinc-400"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT : live preview of a real site document */}
        <div className="fade-up hidden lg:block" style={{ animationDelay: ".15s" }}>
          <div className="relative floaty">
            <div className="absolute -inset-6 rounded-3xl bg-acc/20 blur-3xl opacity-40" />
            <div className="relative glass rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[.03]">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                <div className="ml-3 flex-1 bg-white/5 rounded-md px-3 py-1 text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> webforge.ai/studio
                </div>
                <span className="text-[10px] font-semibold text-acc-soft flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI ENGINE
                </span>
              </div>
              <div className="max-h-[420px] overflow-hidden [mask-image:linear-gradient(#000_70%,transparent)]">
                <SitePageView doc={site} ctx={{ doc: site, device: "desktop", pageIndex: 0 }} />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[.03]">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CircleCheck className="w-3.5 h-3.5" /> Structured schema rendered live
                </span>
                <span className="text-[10px] text-zinc-500">Every section is editable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
