"use client";

import * as Icons from "lucide-react";
import type { CSSProperties } from "react";
import type { Device, Section, SectionType, WebsiteSchema } from "@/types/website";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function getIcon(name?: string) {
  const key = (name ?? "Sparkles") as keyof typeof Icons;
  const Icon = Icons[key] as Icons.LucideIcon | undefined;
  return Icon ?? Icons.Sparkles;
}

export interface RendererCtx {
  doc: WebsiteSchema;
  device: Device;
  pageIndex: number;
  editing?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (pageIndex: number, sectionIndex: number) => void;
  onNavigate?: (slug: string) => void;
}

function effectiveStyles(section: Section, device: Device): Section["styles"] {
  const base = section.styles ?? {};
  if (!section.responsive) return base;
  const overrides = section.responsive[device === "mobile" ? "mobile" : device === "tablet" ? "tablet" : "desktop"];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/** CSS vars that drive the shared pv-* stylesheet. */
function styleVars(section: Section, doc: WebsiteSchema, device: Device): CSSProperties {
  const st = effectiveStyles(section, device);
  const vars: Record<string, string> = {
    "--acc": doc.theme.primaryColor,
    "--pad": `${st.paddingY ?? 44}px`,
    "--maxw": `${st.maxWidth ?? 94}%`,
    "--align": st.textAlign ?? "left",
    "--dur": `${section.animation.durationSec ?? 0.7}s`,
  };
  if (typeof st.gap === "number") vars["--gap"] = `${st.gap}px`;
  const props = section.props as { size?: string; fs?: number; fw?: number };
  const size = props.size;
  const baseFs = size === "md" ? 30 : size === "lg" ? 38 : 30;
  vars["--fs"] = `${props.fs ?? baseFs}px`;
  vars["--fw"] = String(props.fw ?? 700);
  return vars as CSSProperties;
}

interface P {
  [k: string]: unknown;
}

type SectionProps = Section["props"];

function Px(s: Section): SectionProps & { title?: string; accentWord?: string; sub?: string; items?: unknown[]; badge?: string; lines?: { text?: string; accent?: boolean }[]; primaryCta?: { label?: string; href?: string }; secondaryCta?: { label?: string; href?: string }; email?: string; showForm?: boolean; button?: { label?: string; href?: string }; size?: string } {
  return s.props as never;
}

export function NavbarView({ doc, ctx }: { doc: WebsiteSchema; ctx: RendererCtx }) {
  const nav = doc.globalComponents.navbar;
  const pages = doc.pages.filter((p) => p.slug !== "/");
  return (
    <div className="pv-nav">
      <button className="pv-logo" onClick={() => ctx.onNavigate?.("/")}>
        <span className="dot" />
        {nav.brand}
      </button>
      <div className="pv-links">
        {nav.links.map((l, i) => (
          <button
            key={i}
            className="hover:text-white transition cursor-pointer"
            onClick={(e) => {
              const target = l.href.startsWith("#") ? undefined : pages.find((p) => p.slug === l.href);
              if (target && ctx.onNavigate) {
                e.preventDefault();
                ctx.onNavigate(target.slug);
              } else if (l.href.startsWith("/")) {
                ctx.onNavigate?.(l.href);
              }
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <span className="pv-btn pv-btn-acc" onClick={() => ctx.onNavigate?.(nav.cta.href)}>
        {nav.cta.label}
      </span>
    </div>
  );
}

export function FooterView({ doc }: { doc: WebsiteSchema }) {
  const f = doc.globalComponents.footer;
  return (
    <div className="pv-foot">
      <span>{f.copyright || `© ${new Date().getFullYear()} ${f.brand}`}</span>
      <div className="pv-links">
        {f.links.map((l, i) => (
          <button key={i} className="hover:text-white transition cursor-pointer">
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Wrap({ section, ctx, children, className }: { section: Section; ctx: RendererCtx; children: React.ReactNode; className?: string }) {
  const st = effectiveStyles(section, ctx.device);
  const bg = st.background?.mode ?? "none";
  const classes = cn("pv-block", bg === "glass" && "pv-bg-glass", bg === "glow" && "pv-bg-grad", st.shadow && "pv-shadow", ctx.editing && "wf-edit", ctx.selectedSectionId === section.id && "wf-selected", section.animation.effect !== "none" && "pv-anim");
  const extra: CSSProperties = {};
  if (bg === "solid" && st.background?.color) extra.background = st.background.color;
  if (bg === "image" && st.background?.imageUrl) {
    extra.backgroundImage = `url("${st.background.imageUrl}")`;
    extra.backgroundSize = "cover";
    extra.backgroundPosition = "center";
  }
  if (st.radius && (bg === "solid" || bg === "image")) extra.borderRadius = st.radius;
  if (typeof st.opacity === "number") extra.opacity = st.opacity;
  const animDelay = section.animation.delayMs ? ({ animationDelay: `${section.animation.delayMs}ms` } as CSSProperties) : undefined;
  const bgC = bg === "solid" ? st.background?.color : undefined;
  void bgC;
  return (
    <section
      data-section-id={section.id}
      className={classes}
      style={{ ...styleVars(section, ctx.doc, ctx.device), ...extra, ...animDelay }}
      onClick={(e) => {
        if (ctx.editing) {
          e.stopPropagation();
          const pageIndex = ctx.pageIndex;
          const sectionIndex = ctx.doc.pages[pageIndex]?.sections.findIndex((s) => s.id === section.id);
          if (sectionIndex >= 0) ctx.onSelectSection?.(pageIndex, sectionIndex);
        }
      }}
    >
      {children}
    </section>
  );
}

function Title({ text, word, ctx }: { text?: string; word?: string; ctx: RendererCtx }) {
  const hf = { fontFamily: ctx.doc.theme.headingFont === "Inter" ? "Inter, sans-serif" : `'${ctx.doc.theme.headingFont}', sans-serif` };
  return (
    <h2 className="pv-title" style={{ ...(hf as CSSProperties), marginBottom: 0 }}>
      {text ? `${text} ` : ""}
      {word ? <span className="pv-grad">{word}</span> : null}
    </h2>
  );
}

function BlockBody({ type, props, ctx }: { type: SectionType; props: P; ctx: RendererCtx }) {
  const p = props as { title?: string; accentWord?: string; sub?: string; items?: { icon?: string; title?: string; desc?: string; value?: string; label?: string; quote?: string; name?: string; role?: string; price?: string; period?: string; desc2?: string; features?: string[]; highlight?: boolean; image?: string; q?: string; a?: string; ctaLabel?: string }[]; lines?: { text?: string; accent?: boolean }[]; badge?: string; primaryCta?: { label?: string; href?: string }; secondaryCta?: { label?: string; href?: string }; email?: string; showForm?: boolean; button?: { label?: string; href?: string } };

  const items = p.items ?? [];
  const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => <div className={cn("pv-card", className)}>{children}</div>;

  switch (type) {
    case "hero": {
      const lines = (p.lines ?? []).map((l, i) =>
        l.accent ? (
          <span key={i} className="pv-grad">
            {l.text}
          </span>
        ) : (
          <span key={i}>{l.text}</span>
        )
      );
      return (
        <div className="pv-inner">
          {p.badge ? <span className="pv-badge">✦ {p.badge}</span> : null}
          <h1 className="pv-title" style={{ fontFamily: `'${ctx.doc.theme.headingFont}', sans-serif` } as CSSProperties}>
            {lines.map((l, i) => <span key={i}>{i > 0 ? " " : ""}{l}</span>)}
          </h1>
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          <div className="site-hero-cta">
            {p.primaryCta ? (
              <span className="pv-btn pv-btn-acc" onClick={() => ctx.onNavigate?.(p.primaryCta?.href ?? "#")}>
                {p.primaryCta.label}
              </span>
            ) : null}
            {p.secondaryCta ? <span className="pv-btn pv-btn-ghost">{p.secondaryCta.label}</span> : null}
          </div>
        </div>
      );
    }
    case "features":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          <div className="pv-grid pv-cards" style={{ marginTop: 18 }}>
            {items.map((it, i) => {
              const Icon = getIcon(it.icon);
              return (
                <Card key={i}>
                  <div className="ico">
                    <Icon />
                  </div>
                  <h4>{it.title}</h4>
                  <p>{it.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      );
    case "logos":
      return (
        <div className="pv-inner">
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: 12 }}>
            {p.title ?? "Trusted by teams at"}
          </div>
          <div className="pv-links" style={{ justifyContent: "center" }}>
            {items.map((it, i) => (
              <span key={i} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>
                {it.title ?? it.label}
              </span>
            ))}
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="pv-inner">
          <div className="pv-stats" style={{ justifyContent: "center" }}>
            {items.map((it, i) => (
              <div key={i}>
                <b style={{ fontFamily: `'${ctx.doc.theme.headingFont}', sans-serif` }}>{it.value}</b>
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          <div className="pv-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", marginTop: 18 }}>
            {items.map((it, i) => (
              <Card key={i}>
                <p style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6 }}>“{it.quote}”</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <span className="pv-avatar">{initials(it.name ?? "?")}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 10, color: "#71717a" }}>{it.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    case "pricing":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          <div className="pv-grid pv-cards" style={{ marginTop: 18, alignItems: "stretch" }}>
            {items.map((it, i) => (
              <Card
                key={i}
                className={it.highlight ? "pv-price-hl" : undefined}
              >
                <h4>{it.name}</h4>
                <div style={{ fontFamily: `'${ctx.doc.theme.headingFont}', sans-serif`, fontSize: 24, fontWeight: 700, margin: "8px 0" }}>
                  {it.price}
                  <span style={{ fontSize: 10, color: "#71717a" }}>{it.period ?? ""}</span>
                </div>
                <p>{it.desc}</p>
                <div style={{ marginTop: 12 }}>
                  {(it.features ?? []).map((f, j) => (
                    <div key={j} className="pv-check">
                      {f}
                    </div>
                  ))}
                </div>
                <span className={cn("pv-btn", it.highlight ? "pv-btn-acc" : "pv-btn-ghost")} style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
                  {it.ctaLabel ?? (it.highlight ? "Choose plan" : "Get started")}
                </span>
              </Card>
            ))}
          </div>
        </div>
      );
    case "faq":
      return (
        <div className="pv-inner pv-faq">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          <div className="pv-grid" style={{ gap: 10, marginTop: 20, gridTemplateColumns: "1fr" }}>
            {items.map((it, i) => (
              <details key={i}>
                <summary>{it.q}</summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          <div className="pv-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", marginTop: 18 }}>
            {items.map((it, i) => (
              <div key={i} className="pv-card" style={{ padding: 8 }}>
                {it.image ? <img className="pv-img" style={{ height: 150 }} src={it.image} alt={it.title ?? ""} /> : <div className="pv-ghost-card" style={{ height: 150 }}>✦ {it.title}</div>}
                {it.title ? (
                  <div style={{ padding: "10px 4px 4px" }}>
                    <h4>{it.title}</h4>
                    {it.desc ? <p>{it.desc}</p> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          {p.button ? (
            <span className="pv-btn pv-btn-acc" style={{ padding: "11px 26px", marginTop: 18 }} onClick={() => ctx.onNavigate?.(p.button?.href ?? "#")}>
              {p.button.label}
            </span>
          ) : null}
        </div>
      );
    case "contact":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          {p.sub ? <p className="pv-sub">{p.sub}</p> : null}
          {p.email ? (
            <p className="pv-sub" style={{ marginTop: 6 }}>
              ✉ <a href={`mailto:${p.email}`} style={{ color: ctx.doc.theme.primaryColor }}>{p.email}</a>
            </p>
          ) : null}
          {p.showForm ? (
            <div className="site-form-grid pv-form">
              <input type="text" placeholder="Your name" />
              <input type="email" placeholder="Email address" />
              <textarea rows={3} placeholder="How can we help?" />
              <span className="pv-btn pv-btn-acc" style={{ justifyContent: "center" }}>
                Send message
              </span>
            </div>
          ) : null}
        </div>
      );
    case "steps":
      return (
        <div className="pv-inner">
          <Title text={p.title} word={p.accentWord} ctx={ctx} />
          <div className="pv-grid" style={{ gap: 16, marginTop: 20, textAlign: "left", maxWidth: 560 }}>
            {items.map((it, i) => (
              <div key={i} className="pv-step">
                <div className="pv-step-num">{i + 1}</div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>{it.title ?? it.label}</h4>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{it.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="pv-inner" style={{ maxWidth: "80%" }}>
          <div className="pv-divider" />
        </div>
      );
    default:
      return null;
  }
}

export function SectionView({ section, ctx }: { section: Section; ctx: RendererCtx }) {
  return (
    <Wrap section={section} ctx={ctx}>
      <BlockBody type={section.type} props={section.props} ctx={ctx} />
    </Wrap>
  );
}

export function SitePageView({ doc, ctx }: { doc: WebsiteSchema; ctx: RendererCtx }) {
  const page = doc.pages[ctx.pageIndex] ?? doc.pages[0];
  return (
    <div className="wf-site">
      {doc.globalComponents.navbar.enabled ? (
        <div className="pv-block" style={{ paddingTop: 12, paddingBottom: 12 } as CSSProperties}>
          <div className="pv-inner">
            <NavbarView doc={doc} ctx={ctx} />
          </div>
        </div>
      ) : null}
      {page.sections.map((section) => (
        <SectionView key={section.id} section={section} ctx={ctx} />
      ))}
      {doc.globalComponents.footer.enabled ? (
        <div className="pv-block" style={{ paddingTop: 22, paddingBottom: 26 } as CSSProperties}>
          <div className="pv-inner">
            <FooterView doc={doc} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
