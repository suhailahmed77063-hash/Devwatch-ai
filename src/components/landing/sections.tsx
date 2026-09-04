import Link from "next/link";
import {
  Sparkles, Code2, MousePointer2, Monitor, Smartphone, Rocket, Image as ImageIcon, Search,
  MessageSquareText, Wand2, SlidersHorizontal, ArrowRight, Star, Check, Twitter, Github, Linkedin, Youtube, Hammer,
} from "lucide-react";
import { LANDING_COPY } from "@/lib/constants";
import { TEMPLATE_METAS } from "@/lib/templates/catalog";

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Code2, MousePointer2, Monitor, Smartphone, Rocket, Image: ImageIcon, Search,
};

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquareText, Wand2, SlidersHorizontal, Rocket,
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">Capabilities</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight text-white">
            Everything you need to <span className="grad-text">ship faster</span>
          </h2>
          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
            One AI copilot that designs, codes, writes, optimizes and deploys — while you stay in creative control.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {LANDING_COPY.features.map((f, i) => {
            const Icon = FEATURE_ICONS[f.icon] ?? Sparkles;
            return (
              <div key={i} className="glass rounded-2xl p-6 card-hover fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-acc/15 border border-acc/25 text-acc-soft flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white">{f.title}</h3>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="py-24 bg-white/[.02] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">Workflow</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight text-white">
            From idea to live site in <span className="grad-text">4 steps</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5 relative">
          <div className="hidden md:block absolute top-9 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-acc/50 to-transparent" />
          {LANDING_COPY.steps.map((s, i) => {
            const Icon = STEP_ICONS[s.icon] ?? Rocket;
            return (
              <div key={i} className="relative glass rounded-2xl p-6 card-hover text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl btn-acc flex items-center justify-center relative z-10 mb-5">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-acc-soft font-bold mb-1.5">Step {i + 1}</div>
                <h3 className="font-display font-semibold text-white">{s.title}</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TemplatesSection() {
  return (
    <section id="templates" className="py-24">
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">Templates</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight text-white">
              Start from a <span className="grad-text">stunning base</span>
            </h2>
          </div>
          <Link href="/projects/new" className="glass rounded-xl px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:border-acc/50 transition flex items-center gap-2">
            Start a project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEMPLATE_METAS.slice(0, 8).map((t) => (
            <Link key={t.slug} href={`/projects/new?template=${t.slug}`} className="group glass rounded-2xl overflow-hidden card-hover">
              <div className="relative h-44 overflow-hidden bg-[#101013]">
                {t.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.coverImage} alt={`${t.name} template`} loading="lazy" className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-3xl font-bold text-acc-soft" style={{ background: `radial-gradient(60% 60% at 50% 30%, ${t.accent}33, transparent)` }}>
                    {t.name}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4">
                  <span className="btn-acc text-white text-xs font-semibold px-4 py-2 rounded-lg translate-y-2 group-hover:translate-y-0 transition">Use Template</span>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{t.name}</span>
                <span className="text-[10px] text-zinc-500">{t.category}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const BEFORE_AFTER = [
  "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1bcae4fec-89a8-4e3d-a3b7-0d424a7d8b49.png",
  "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1df748f20-5067-486a-b4d8-6af5ff8536b2.png",
];

export function AiShowcaseSection() {
  return (
    <section className="py-24 bg-white/[.02] border-y border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">AI Editing</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight leading-tight text-white">
            Edit with words.
            <br />
            <span className="grad-text">Ship in seconds.</span>
          </h2>
          <p className="text-zinc-400 mt-4">
            No layers panel, no CSS. Tell the AI what to change and watch your site transform live — each request is applied as a precise,
            versioned edit to your site structure, never a blind rewrite.
          </p>
          <div className="mt-8 space-y-4 max-w-md">
            <div className="flex justify-end">
              <div className="btn-acc rounded-2xl rounded-br-sm px-4 py-3 text-sm text-white max-w-[85%]">
                “Make the hero section more modern and change the primary color to red.”
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl btn-acc flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-zinc-200 max-w-[85%]">
                Done! I&apos;ve updated the hero and color theme — 3 changes applied and saved as a new version. ✨
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {["✓ Hero redesigned", "✓ Theme → Crimson", "✓ New version created"].map((c) => (
                <span key={c} className="glass rounded-full px-3 py-1 text-[11px] text-emerald-400">{c}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="grid grid-cols-2 gap-4 items-center">
            {BEFORE_AFTER.map((src, i) => (
              <div key={i} className={`glass rounded-2xl overflow-hidden ${i === 1 ? "border-acc/40 shadow-[0_0_50px_-12px_rgba(220,20,60,.5)]" : ""}`}>
                <div className={`px-4 py-2 text-[10px] uppercase tracking-widest border-b border-white/5 flex items-center gap-2 ${i === 1 ? "text-acc-soft" : "text-zinc-500"}`}>
                  {i === 0 ? "Before" : "After AI"}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={i === 0 ? "Website before AI redesign" : "Website after AI redesign"} className={`w-full h-64 object-cover ${i === 0 ? "opacity-80" : ""}`} />
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full btn-acc flex items-center justify-center shadow-xl z-10">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

const PLANS: { name: string; price: string; per: string; hot?: boolean; cta: string; feats: string[] }[] = [
  { name: "Free", price: "$0", per: "forever", cta: "Start for free", feats: ["3 AI generations / month", "1 published project", "WebForge subdomain", "Community support", "Basic templates"] },
  { name: "Pro", price: "$24", per: "/ month", hot: true, cta: "Go Pro", feats: ["Unlimited AI generations", "10 published projects", "Custom domains", "AI image generation", "Advanced SEO tools", "Priority rendering queue", "Code export"] },
  { name: "Enterprise", price: "Custom", per: "", cta: "Contact sales", feats: ["Everything in Pro", "Unlimited projects & seats", "SSO / SAML & audit logs", "Dedicated AI model tuning", "99.99% uptime SLA", "White-glove onboarding"] },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">Pricing</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight text-white">
            Simple plans, <span className="grad-text">serious power</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative glass rounded-3xl p-7 flex flex-col card-hover ${p.hot ? "border-acc/50 shadow-[0_0_60px_-18px_rgba(220,20,60,.55)]" : ""}`}>
              {p.hot ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 btn-acc text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-display font-semibold text-lg text-white">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`font-display font-bold text-4xl ${p.hot ? "grad-text" : "text-white"}`}>{p.price}</span>
                <span className="text-xs text-zinc-500">{p.per}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-400 flex-1">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-acc-soft shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.hot ? "/login?next=/settings?tab=billing" : p.name === "Enterprise" ? "mailto:sales@webforge.app" : "/login?next=/projects"}
                className={`${p.hot ? "btn-acc text-white" : "glass text-zinc-200 hover:border-acc/50"} mt-7 rounded-xl py-3 text-sm font-semibold transition text-center`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="community" className="py-24 bg-white/[.02] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[.25em] text-acc-soft font-semibold">Community</span>
          <h2 className="font-display font-bold text-4xl md:text-5xl mt-3 tracking-tight text-white">
            Loved by <span className="grad-text">120,000+ builders</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LANDING_COPY.testimonials.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6 card-hover fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-acc-soft text-acc-soft" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">“{t[2]}”</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "linear-gradient(135deg,#f43f5e,#7f1d1d)" }}>
                  {t[0].split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{t[0]}</div>
                  <div className="text-[11px] text-zinc-500">{t[1]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-5">
        <div className="glow-wrap">
          <div className="glow-inner bg-[#0c0c0f] rounded-3xl p-10 md:p-14 text-center border border-white/10">
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-white">
              Ready to build something <span className="grad-text">extraordinary</span>?
            </h2>
            <p className="text-zinc-400 mt-4">Join thousands of founders, designers and developers shipping with WebForge AI.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/login?next=/projects" className="btn-acc text-white font-semibold px-7 py-3.5 rounded-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Start Building — it&apos;s free
              </Link>
              <Link href="/projects/new" className="glass rounded-xl px-7 py-3.5 text-sm text-zinc-300 hover:text-white transition">
                Explore templates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <a href="#" className="flex items-center gap-2.5 font-display font-bold text-lg text-white">
            <span className="w-8 h-8 rounded-xl btn-acc flex items-center justify-center">
              <Hammer className="w-4 h-4 text-white" />
            </span>
            WebForge <span className="grad-text">AI</span>
          </a>
          <p className="text-sm text-zinc-500 mt-4 max-w-xs">
            The AI website builder that turns plain language into production-ready websites.
          </p>
          <div className="flex gap-3 mt-6">
            {[Twitter, Github, Linkedin, Youtube].map((Icon, i) => (
              <a key={i} href="#" aria-label="Social link" className="glass p-2.5 rounded-xl text-zinc-400 hover:text-white hover:border-acc/50 transition">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        {(
          [
            ["Product", ["Features", "Templates", "Pricing", "Changelog", "Roadmap"]],
            ["Resources", ["Documentation", "AI Prompt Guide", "Tutorials", "API Reference", "Status"]],
            ["Company", ["About", "Community", "Careers", "Privacy", "Terms"]],
          ] as const
        ).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              {links.map((l) => (
                <li key={l}>
                  <a className="hover:text-acc-soft transition" href={l === "Features" ? "#features" : l === "Templates" ? "#templates" : l === "Pricing" ? "#pricing" : l === "Community" ? "#community" : "#"}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-5 mt-12 pt-6 border-t border-white/5 flex flex-wrap justify-between gap-3 text-xs text-zinc-600">
        <span>© {new Date().getFullYear()} WebForge AI, Inc. All rights reserved.</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All systems operational
        </span>
      </div>
    </footer>
  );
}
