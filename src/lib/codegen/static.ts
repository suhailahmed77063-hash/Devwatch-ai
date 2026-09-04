import type { Device, Section, WebsiteSchema } from "@/types/website";
import { escapeHtml } from "@/lib/utils";
import { FONT_STACK } from "@/lib/website/schema";
import { SITE_CSS } from "./site-css";

const esc = escapeHtml;

type Props = Record<string, unknown>;
interface RawItem {
  title?: string;
  desc?: string;
  quote?: string;
  name?: string;
  role?: string;
  value?: string;
  label?: string;
  price?: string;
  period?: string;
  features?: string[];
  highlight?: boolean;
  ctaLabel?: string;
  q?: string;
  a?: string;
  image?: string;
  icon?: string;
  text?: string;
  accent?: boolean;
  href?: string;
  qlabel?: string;
}
interface RawSect extends Props {
  badge?: string;
  lines?: RawItem[];
  sub?: string;
  primaryCta?: RawItem;
  secondaryCta?: RawItem;
  title?: string;
  accentWord?: string;
  items?: RawItem[];
  email?: string;
  showForm?: boolean;
  button?: RawItem;
}

function arr(v: unknown): RawItem[] {
  return Array.isArray(v) ? (v as RawItem[]) : [];
}

function headFont(theme: WebsiteSchema["theme"]): string {
  return FONT_STACK[theme.headingFont] ?? FONT_STACK["Space Grotesk"];
}

function bodyFont(theme: WebsiteSchema["theme"]): string {
  return FONT_STACK[theme.bodyFont] ?? FONT_STACK.Inter;
}

function accent(s: Section): string {
  const t = s.type;
  const title = (s.props as RawSect).accentWord;
  return title ? `<span class="pv-grad">${esc(title)}</span>` : "";
}

/** inline CSS vars for the section block (desktop/tablet/mobile friendly) */
function blockStyle(section: Section, theme: WebsiteSchema["theme"]): string {
  const st = section.styles ?? {};
  const css: string[] = [];
  css.push(`--acc:${theme.primaryColor}`);
  css.push(`--pad:${st.paddingY ?? 44}px`);
  css.push(`--maxw:${st.maxWidth ?? 94}%`);
  css.push(`--align:${st.textAlign ?? "left"}`);
  if (typeof st.gap === "number") css.push(`--gap:${st.gap}px`);
  css.push(`--fs:${typeof (section.props as RawSect)?.size !== "undefined" && (section.props as RawSect).size === "md" ? "26px" : "34px"}`);
  if (theme.primaryColor) css.push(`--acc:${theme.primaryColor}`);
  return css.join(";");
}

function blockClass(section: Section): string {
  const bg = section.styles?.background?.mode ?? "none";
  const cls = ["pv-block"];
  if (bg === "glass") cls.push("pv-bg-glass");
  if (bg === "glow") cls.push("pv-bg-grad");
  if (section.styles?.shadow) cls.push("pv-shadow");
  return cls.join(" ");
}

function blockExtraStyle(section: Section): string {
  const parts: string[] = [];
  const bg = section.styles?.background;
  if (bg?.mode === "solid" && bg.color) parts.push(`background:${bg.color}`);
  if (bg?.mode === "image" && bg.imageUrl) parts.push(`background-image:url('${esc(bg.imageUrl)}');background-size:cover;background-position:center`);
  if (section.styles?.radius && section.styles.radius > 0 && (bg?.mode === "solid" || bg?.mode === "image")) parts.push(`border-radius:${section.styles.radius}px`);
  if (typeof section.styles?.opacity === "number") parts.push(`opacity:${section.styles.opacity}`);
  return parts.join(";");
}

/* per-type inner markup --------------------------------------------------- */

function heroInner(s: Section, theme: WebsiteSchema["theme"]): string {
  const p = s.props as RawSect;
  const lines = (p.lines ?? []).map((l) => `<span${l.accent ? ' class="pv-grad"' : ""}>${esc(l.text ?? "")}</span>`).join(" ");
  const head = `<h1 class="pv-title" style="font-family:${headFont(theme)}">${lines}</h1>`;
  const badge = p.badge ? `<span class="pv-badge">✦ ${esc(p.badge)}</span>` : "";
  const sub = p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : "";
  const ctas = [p.primaryCta, p.secondaryCta]
    .filter(Boolean)
    .map((c) => `<a class="pv-btn ${c === p.primaryCta ? "pv-btn-acc" : "pv-btn-ghost"}" href="${esc(c?.href ?? "#")}">${esc(c?.label ?? "")}</a>`)
    .join("");
  return `<div class="pv-inner">${badge}${head}${sub}${ctas ? `<div class="site-hero-cta">${ctas}</div>` : ""}</div>`;
}

function featuresInner(s: Section): string {
  const p = s.props as RawSect;
  const items = arr(p.items)
    .map(
      (it) => `<div class="pv-card"><div class="ico">◆</div><h4>${esc(it.title ?? "")}</h4><p>${esc(it.desc ?? "")}</p></div>`
    )
    .join("");
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}<div class="pv-grid pv-cards" style="margin-top:18px">${items}</div></div>`;
}

function logosInner(s: Section): string {
  const p = s.props as RawSect;
  const items = arr(p.items).map((it) => `<span style="font-family:${'"Space Grotesk",sans-serif'};font-weight:600">${esc(it.name ?? it.text ?? "")}</span>`).join("");
  return `<div class="pv-inner"><div style="font-size:10px;letter-spacing:.2em;color:#52525b;text-transform:uppercase;margin-bottom:12px">${esc(p.title ?? "Trusted by teams at")}</div><div class="pv-links" style="justify-content:center">${items}</div></div>`;
}

function statsInner(s: Section, theme: WebsiteSchema["theme"]): string {
  const p = s.props as RawSect;
  const items = arr(p.items).map((it) => `<div><b style="font-family:${headFont(theme)}">${esc(it.value ?? "")}</b><span>${esc(it.label ?? "")}</span></div>`).join("");
  return `<div class="pv-inner"><div class="pv-stats" style="justify-content:${s.styles?.textAlign === "center" ? "center" : "flex-start"}">${items}</div></div>`;
}

function testimonialsInner(s: Section, theme: WebsiteSchema["theme"]): string {
  const p = s.props as RawSect;
  const items = arr(p.items)
    .map((it) => {
      const ini = (it.name ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      return `<div class="pv-card"><p style="font-size:12px;color:#d4d4d8;line-height:1.6">"${esc(it.quote ?? "")}"</p><div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span class="pv-avatar" style="font-family:${headFont(theme)}">${esc(ini)}</span><div><div style="font-size:12px;font-weight:600">${esc(it.name ?? "")}</div><div style="font-size:10px;color:#71717a">${esc(it.role ?? "")}</div></div></div></div>`;
    })
    .join("");
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}<div class="pv-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:18px">${items}</div></div>`;
}

function pricingInner(s: Section, theme: WebsiteSchema["theme"]): string {
  const p = s.props as RawSect;
  const items = arr(p.items)
    .map((it) => {
      const feats = (it.features ?? []).map((f) => `<div class="pv-check">${esc(f)}</div>`).join("");
      const hl = it.highlight ? ` style="border-color:${theme.primaryColor};box-shadow:0 0 34px -12px ${theme.primaryColor}"` : "";
      return `<div class="pv-card"${hl}><h4>${esc(it.name ?? "")}</h4><div class="pv-price" style="font-family:${headFont(theme)}">${esc(it.price ?? "")}<span style="font-size:11px;color:#71717a">${esc(it.period ?? "")}</span></div><p>${esc(it.desc ?? "")}</p><div style="margin-top:12px">${feats}</div><a class="pv-btn ${it.highlight ? "pv-btn-acc" : "pv-btn-ghost"}" style="margin-top:14px" href="#">${esc(it.ctaLabel ?? (it.highlight ? "Choose" : "Start"))}</a></div>`;
    })
    .join("");
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}<div class="pv-grid pv-cards" style="margin-top:18px;align-items:stretch">${items}</div></div>`;
}

function faqInner(s: Section): string {
  const p = s.props as RawSect;
  const items = arr(p.items).map((it) => `<details${""}><summary>${esc(it.q ?? it.qlabel ?? "")}</summary><p>${esc(it.a ?? "")}</p></details>`).join("");
  return `<div class="pv-inner pv-faq"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2><div class="pv-grid" style="gap:10px;margin-top:20px;grid-template-columns:1fr">${items}</div></div>`;
}

function galleryInner(s: Section, theme: WebsiteSchema["theme"]): string {
  const p = s.props as RawSect;
  const items = arr(p.items)
    .map((it) => {
      const media = it.image ? `<img class="pv-img" style="height:150px" src="${esc(it.image)}" alt="${esc(it.title ?? "")}">` : `<div class="pv-ghost-card" style="height:150px"><span style="font-size:22px">✦</span>${esc(it.title ?? "Image")}</div>`;
      const caption = it.title ? `<h4 style="margin-top:10px">${esc(it.title)}</h4>${it.desc ? `<p>${esc(it.desc)}</p>` : ""}` : "";
      return `<div class="pv-card" style="padding:8px"><div style="font-family:${headFont(theme)}">${media}</div>${caption}</div>`;
    })
    .join("");
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}<div class="pv-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-top:18px">${items}</div></div>`;
}

function ctaInner(s: Section): string {
  const p = s.props as RawSect;
  const btn = p.button ? `<a class="pv-btn pv-btn-acc" style="padding:11px 26px;margin-top:18px" href="${esc(p.button.href ?? "#")}">${esc(p.button.label ?? "Get started")}</a>` : "";
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}${btn}</div>`;
}

function contactInner(s: Section): string {
  const p = s.props as RawSect;
  const form = p.showForm
    ? `<form class="site-form-grid pv-form" onsubmit="event.preventDefault();this.innerHTML='<div style=color:#4ade80;font-weight:600>Thanks — we\\'ll be in touch soon.</div>'"><input type="text" placeholder="Your name" required><input type="email" placeholder="Email address" required><textarea rows="4" placeholder="How can we help?" required></textarea><button class="pv-btn pv-btn-acc" type="submit" style="justify-content:center">Send message</button></form>`
    : "";
  const mail = p.email ? `<p class="pv-sub" style="margin-top:6px">✉ <a href="mailto:${esc(p.email)}" style="color:var(--acc,#e11d48)">${esc(p.email)}</a></p>` : "";
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2>${p.sub ? `<p class="pv-sub">${esc(p.sub)}</p>` : ""}${mail}${form}</div>`;
}

function stepsInner(s: Section): string {
  const p = s.props as RawSect;
  const items = arr(p.items).map((it, i) => `<div class="pv-step"><div class="pv-step-num">${i + 1}</div><div><h4 style="font-size:14px;font-weight:600">${esc(it.title ?? "")}</h4><p style="font-size:12px;color:#9ca3af;margin-top:3px">${esc(it.desc ?? "")}</p></div></div>`).join("");
  return `<div class="pv-inner"><h2 class="pv-title">${esc(p.title ?? "")} ${accent(s)}</h2><div class="pv-grid" style="gap:18px;margin-top:20px;text-align:left">${items}</div></div>`;
}

function dividerInner(): string {
  return `<div class="pv-inner" style="max-width:80%"><div class="pv-divider"></div></div>`;
}

function sectionBody(s: Section, theme: WebsiteSchema["theme"]): string {
  switch (s.type) {
    case "hero": return heroInner(s, theme);
    case "features": return featuresInner(s);
    case "logos": return logosInner(s);
    case "stats": return statsInner(s, theme);
    case "testimonials": return testimonialsInner(s, theme);
    case "pricing": return pricingInner(s, theme);
    case "faq": return faqInner(s);
    case "gallery": return galleryInner(s, theme);
    case "cta": return ctaInner(s);
    case "contact": return contactInner(s);
    case "steps": return stepsInner(s);
    case "divider": return dividerInner();
    default: return "";
  }
}

function navHtml(doc: WebsiteSchema, theme: WebsiteSchema["theme"]): string {
  const nav = doc.globalComponents.navbar;
  const links = nav.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("");
  return `<section class="pv-block" style="--pad:14px;--acc:${theme.primaryColor}">
  <div class="pv-inner pv-nav">
    <a class="pv-logo" href="/" style="font-family:${headFont(theme)}"><span class="dot"></span>${esc(nav.brand)}</a>
    <div class="pv-links">${links}</div>
    <a class="pv-btn pv-btn-acc" href="${esc(nav.cta.href)}">${esc(nav.cta.label)}</a>
  </div></section>`;
}

function footerHtml(doc: WebsiteSchema, theme: WebsiteSchema["theme"]): string {
  const f = doc.globalComponents.footer;
  const links = f.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("");
  return `<section class="pv-block" style="--pad:26px;--acc:${theme.primaryColor}">
  <div class="pv-inner pv-foot"><span>${esc(f.copyright || `© ${new Date().getFullYear()} ${f.brand}`)}</span><div class="pv-links">${links}</div></div></section>`;
}

/** Render one page of the site as a complete standalone HTML document. */
export function renderPageHtml(doc: WebsiteSchema, slug: string, opts?: { assetBaseUrl?: string }): string {
  const page = doc.pages.find((p) => p.slug === slug) ?? doc.pages[0];
  const theme = doc.theme;
  const headFonts = FONT_STACK[theme.headingFont];
  const title = page.seo.title || doc.metadata.name;
  const desc = page.seo.description || doc.metadata.description;

  const extraHead: string[] = [];
  if (page.seo.canonicalUrl) extraHead.push(`<link rel="canonical" href="${esc(page.seo.canonicalUrl)}">`);
  const og = page.seo.ogImage ?? doc.metadata.logoUrl;
  if (og) extraHead.push(`<meta property="og:image" content="${esc(og)}">`);
  extraHead.push(`<meta property="og:title" content="${esc(title)}">`);
  extraHead.push(`<meta property="og:description" content="${esc(desc)}">`);
  extraHead.push(`<meta name="twitter:card" content="summary_large_image">`);
  for (const ld of page.seo.jsonLd ?? []) {
    try {
      extraHead.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
    } catch {
      // skip invalid structured data
    }
  }

  const bodyParts: string[] = [];
  if (doc.globalComponents.navbar.enabled) bodyParts.push(navHtml(doc, theme));
  for (const section of page.sections) {
    bodyParts.push(`<section class="${blockClass(section)}" style="${blockStyle(section, theme)};${blockExtraStyle(section)}">${sectionBody(section, theme)}</section>`);
  }
  if (doc.globalComponents.footer.enabled) bodyParts.push(footerHtml(doc, theme));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
${extraHead.join("\n")}
<style>${SITE_CSS}</style>
</head>
<body>
<div class="pv-page" style="background:${theme.background};color:${theme.textColor};font-family:${bodyFont(theme)};--acc:${theme.primaryColor}">
${bodyParts.join("\n")}
</div>
</body>
</html>`;
}

/** Render every page of the document. */
export function renderAllPages(doc: WebsiteSchema): Record<string, string> {
  const out: Record<string, string> = {};
  for (const page of doc.pages) {
    const html = renderPageHtml(doc, page.slug);
    const path = page.slug === "/" ? "index.html" : `${page.slug.replace(/^\//, "").replace(/\/$/, "") || "home"}.html`;
    out[path] = html;
  }
  return out;
}

/** Flat export file set: html pages + robots + sitemap + schema snapshot + readme. */
export function buildExportFiles(doc: WebsiteSchema): Record<string, string> {
  const pages = renderAllPages(doc);
  const files: Record<string, string> = { ...pages };

  const robots = `User-agent: *\nAllow: /\n${doc.pages.filter((p) => p.slug !== "/").map((p) => `Disallow: ${p.slug}`).join("\n")}\n`;
  files["robots.txt"] = robots;

  const origin = "https://example.com"; // replaced on deploy with real origin
  const urls = doc.pages
    .map((p) => `  <url><loc>${origin}${p.slug === "/" ? "" : p.slug}</loc></url>`)
    .join("\n");
  files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  files["webforge.schema.json"] = JSON.stringify(doc, null, 2);
  files["README.md"] = `# ${doc.metadata.name}\n\n> Exported from WebForge AI.\n\n${doc.metadata.description}\n\n## Files\n- Standalone HTML pages (open \`index.html\` in a browser)\n- \`robots.txt\` / \`sitemap.xml\` — placeholders, update the domain before going live\n- \`webforge.schema.json\` — structured site schema (source of truth)\n`;
  return files;
}
