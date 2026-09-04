import type { WebsiteSchema } from "@/types/website";

export interface SeoCheck {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  detail?: string;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function countJsonLd(doc: WebsiteSchema): number {
  return doc.pages.reduce((acc, p) => acc + (p.seo.jsonLd?.length ?? 0), 0);
}

function hasHttpLinks(doc: WebsiteSchema): boolean {
  const json = JSON.stringify(doc);
  return /"https?:\/\/"|"http:\/\//.test(json) && /http:\/\//.test(json);
}

export interface SeoReport {
  score: number; // 0..100 from real checks
  checks: SeoCheck[];
}

export function runSeoChecks(doc: WebsiteSchema): SeoReport {
  const checks: SeoCheck[] = [];
  const md = doc.metadata;
  const home = doc.pages.find((p) => p.slug === "/");
  const pages = doc.pages;

  const add = (id: string, label: string, ok: boolean, weight: number, detail?: string) => {
    if (ok) checks.push({ id, label, ok, weight });
    else checks.push({ id, label, ok, weight, detail: detail ?? label });
  };

  // metadata
  add("site.name", "Site name is set", md.name.trim().length >= 2, 4);
  add("site.desc", "Meta description present", md.description.trim().length >= 50 && md.description.length <= 400, 6, md.description.trim().length < 50 ? "Description is shorter than 50 characters." : "Description exceeds 400 characters.");
  add("site.logo", "Logo / favicon available", Boolean(md.logoUrl) || md.assets.length > 0, 4, "Add a logo or upload assets.");

  // theme contrast — real accessibility check
  const textContrast = contrast(doc.theme.textColor, doc.theme.background);
  add("theme.contrast", "Body text contrast ≥ 4.5:1", textContrast >= 4.5, 10, `Current contrast is ${textContrast.toFixed(1)}:1.`);

  const titleContrast = contrast(doc.theme.textColor, doc.theme.surface);
  add("theme.surface", "Text on cards contrast ≥ 3:1", titleContrast >= 3, 5, `Card contrast is ${titleContrast.toFixed(1)}:1.`);

  // home page hero
  const heroOnHome = home?.sections.some((s) => s.type === "hero");
  add("home.hero", "Home page has a hero", Boolean(heroOnHome), 8, "Add a hero section to the home page.");
  add("home.h1", "Home hero has headline", Boolean(home && heroOnHome && (home.sections.find((s) => s.type === "hero")?.props as { lines?: unknown[] } | undefined)?.lines?.length), 4);

  // per page SEO
  let titleOk = 0;
  let titleUnique = new Set<string>();
  let descOk = 0;
  for (const p of pages) {
    const t = p.seo.title ?? "";
    const d = p.seo.description ?? "";
    if (t.trim().length >= 15 && t.length <= 65) titleOk++;
    else if (t.trim().length > 0) {
      // still counts toward uniqueness tracking only
    }
    if (t) titleUnique.add(t.trim().toLowerCase());
    if (d.trim().length >= 70 && d.length <= 165) descOk++;
  }
  add("seo.titles", "All pages have strong titles (15-65 chars)", titleOk === pages.length, 12, `${pages.length - titleOk} page(s) need a title between 15 and 65 characters.`);
  add("seo.unique", "Titles are unique across pages", titleUnique.size === pages.length, 6, "Duplicate titles confuse search engines.");
  add("seo.descriptions", "All pages have meta descriptions (70-165 chars)", descOk === pages.length, 12, `${pages.length - descOk} page(s) need a 70-165 character description.`);
  add("seo.jsonld", "Structured data present (JSON-LD)", countJsonLd(doc) >= 1, 8, "Add schema.org structured data (e.g. WebSite / Organization).");
  add("seo.nohttp", "No insecure http:// links", !hasHttpLinks(doc), 3, "Replace http:// links with https://.");

  // content quality
  const emptyPages = pages.filter((p) => p.sections.length === 0).length;
  add("content.pages", "Every page has content sections", emptyPages === 0, 8, `${emptyPages} page(s) have no sections.`);
  const galleryItems = pages.flatMap((p) => p.sections.filter((s) => s.type === "gallery"));
  let items = 0;
  let titled = 0;
  for (const g of galleryItems) {
    const arr = (g.props as { items?: unknown[] }).items ?? [];
    for (const it of arr as { title?: string; image?: string }[]) {
      items++;
      if (it.title?.trim()) titled++;
    }
  }
  add("content.alt", "Images have titles/alt context", items === 0 || titled === items, 5, `${items - titled} image(s) are missing titles.`);

  // navigation
  const navLinks = doc.globalComponents.navbar.links.length + (doc.globalComponents.navbar.cta.label ? 1 : 0);
  add("nav.links", "Navigation is set up", navLinks >= 2, 4, "Add at least 2 navigation links.");
  const internal = pages.map((p) => p.slug).filter((s) => s !== "/");
  const used = internal.filter((slug) => JSON.stringify(doc).includes(`"${slug}"`));
  add("nav.internal", "Secondary pages are linked", used.length === internal.length, 5, internal.filter((s) => !used.includes(s)).map((s) => `${s} is not linked from navigation.`).join(" "));

  const totalWeight = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  const maxWeight = checks.reduce((a, c) => a + c.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round((totalWeight / Math.max(maxWeight, 1)) * 100)));
  return { score, checks };
}
