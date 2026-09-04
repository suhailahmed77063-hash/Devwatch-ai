import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Hammer, LayoutTemplate } from "lucide-react";
import { TEMPLATE_METAS } from "@/lib/templates/catalog";
import { NewProjectClient } from "./new-project-client";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ template?: string; prompt?: string }> }) {
  const { template, prompt } = await searchParams;
  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 mt-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-acc-soft" />
            <h1 className="font-display font-bold text-2xl tracking-tight text-white">Create a project</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Start from a prompt for the AI to build, or pick a template.</p>

          <NewProjectClient presetPrompt={prompt} />

          {/* templates */}
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <LayoutTemplate className="w-4 h-4 text-acc-soft" />
              <h2 className="font-display font-bold text-lg text-white">Or start from a template</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" id="template-grid">
              {TEMPLATE_METAS.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  className="group glass rounded-xl overflow-hidden text-left card-hover"
                  data-template={t.slug}
                >
                  <div className="relative h-28 bg-[#101013] flex items-center justify-center">
                    {t.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.coverImage} alt={t.name} loading="lazy" className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500" />
                    ) : (
                      <span className="font-display text-xl font-bold text-acc-soft">{t.name}</span>
                    )}
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] text-zinc-500">{t.category}</div>
                    </div>
                    <Hammer className="w-3.5 h-3.5 text-acc-soft" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="glass rounded-2xl p-5 sticky top-24">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-acc-soft" /> AI prompt tips</h3>
            <ul className="mt-3 space-y-2.5 text-[13px] text-zinc-400 leading-relaxed list-disc pl-4">
              <li>Mention the site type: “SaaS site”, “portfolio”, “restaurant”.</li>
              <li>Describe the vibe: “dark and premium”, “light and playful”.</li>
              <li>Name the brand and its offer.</li>
              <li>List the pages you want: Home, Pricing, FAQ…</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
