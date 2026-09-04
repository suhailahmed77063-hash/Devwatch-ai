"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createProjectAction } from "@/lib/actions/projects";

const EXAMPLES = [
  "Modern SaaS landing page for an AI startup — dark theme, pricing, testimonials",
  "Portfolio for a product designer with selected work and about page",
  "Restaurant website with menu highlights, gallery and reservation CTA",
];

export function NewProjectClient({ presetPrompt }: { presetPrompt?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(presetPrompt ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (presetPrompt) setPrompt(presetPrompt);
  }, [presetPrompt]);

  const buildWithAi = async () => {
    const text = prompt.trim();
    if (!text) {
      toast("Describe the website you want to build first.", "error");
      return;
    }
    setBusy("ai");
    const res = await createProjectAction({ name: text.slice(0, 60) });
    if (!res.ok || !res.projectId) {
      toast(res.error ?? "Could not create the project.", "error");
      setBusy(null);
      return;
    }
    router.push(`/studio/${res.projectId}?prompt=${encodeURIComponent(text)}`);
  };

  const useTemplate = async (slug: string) => {
    setBusy(slug);
    const res = await createProjectAction({ template: slug });
    if (!res.ok || !res.projectId) {
      toast(res.error ?? "Could not create the project.", "error");
      setBusy(null);
      return;
    }
    router.push(`/studio/${res.projectId}`);
  };

  const wireTemplates = () => {
    const grid = document.getElementById("template-grid");
    if (!grid) return;
    grid.querySelectorAll<HTMLButtonElement>("[data-template]").forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => useTemplate(btn.dataset.template ?? ""));
    });
  };
  useEffect(wireTemplates, [busy]);

  return (
    <div className="mt-6">
      <div className="glow-wrap">
        <div className="glow-inner bg-[#0c0c0f] border border-white/10 p-4">
          <label htmlFor="aiPrompt" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            Describe your website
          </label>
          <Textarea
            id="aiPrompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Create a modern SaaS website for an AI startup with a pricing page, FAQ and a contact form…"
            className="mt-2 bg-transparent border-transparent px-0 focus:border-transparent placeholder-zinc-600"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5">
            <div className="flex flex-wrap gap-1.5 max-w-[420px]">
              {EXAMPLES.slice(0, 2).map((ex) => (
                <button key={ex} type="button" className="chip glass rounded-full px-3 py-1 text-[11px] text-zinc-400" onClick={() => setPrompt(ex)}>
                  {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
                </button>
              ))}
            </div>
            <Button type="button" onClick={buildWithAi} disabled={busy === "ai"} className="px-5">
              {busy === "ai" ? <Loader2 className="w-4 h-4 spin-slow" /> : <Sparkles className="w-4 h-4" />}
              Generate with AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
