import { z } from "zod";
import type {
  NavbarConfig,
  FooterConfig,
  Operation,
  Section,
  SectionType,
  Theme,
  WebsiteSchema,
} from "@/types/website";
import { SCHEMA_VERSION } from "@/types/website";
import { SECTION_DEFS } from "./sections";

/* ── leaf schemas ─────────────────────────────────────────────────────────── */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

const linkSchema = z.object({ label: z.string().max(80), href: z.string().max(500) });
const navLinkSchema = z.object({ label: z.string().max(80), href: z.string().max(500) });

const navbarSchema = z.object({
  enabled: z.boolean().default(true),
  brand: z.string().max(80),
  links: z.array(navLinkSchema).max(12).default([]),
  cta: linkSchema.default({ label: "Get Started", href: "#" }),
  sticky: z.boolean().default(true),
});

const footerSchema = z.object({
  enabled: z.boolean().default(true),
  brand: z.string().max(80).default(""),
  copyright: z.string().max(200).default(""),
  links: z.array(navLinkSchema).max(12).default([]),
  social: z.boolean().default(true),
});

const seoSchema = z.object({
  title: z.string().max(160).default(""),
  description: z.string().max(320).default(""),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ogImage: z.string().max(1000).optional(),
  jsonLd: z.array(z.record(z.string(), z.unknown())).optional(),
});

const backgroundSchema = z.object({
  mode: z.enum(["none", "solid", "glass", "glow", "image"]).default("none"),
  color: hexColor.optional(),
  imageUrl: z.string().max(2000).optional(),
});

const stylesSchema = z.object({
  paddingY: z.number().min(0).max(200).optional(),
  paddingX: z.number().min(0).max(200).optional(),
  maxWidth: z.number().min(50).max(100).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  radius: z.number().min(0).max(48).optional(),
  background: backgroundSchema.optional(),
  gap: z.number().min(0).max(80).optional(),
  shadow: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const animationSchema = z.object({
  effect: z.enum(["fadeUp", "none"]).default("none"),
  durationSec: z.number().min(0.1).max(5).default(0.7),
  delayMs: z.number().min(0).max(3000).default(0),
});

const themeSchema = z.object({
  primaryColor: hexColor,
  background: hexColor,
  surface: hexColor,
  textColor: hexColor,
  mutedColor: hexColor.optional(),
  headingFont: z.enum(["Space Grotesk", "Inter", "Poppins", "Sora"]).default("Space Grotesk"),
  bodyFont: z.enum(["Inter", "Space Grotesk", "Poppins", "Sora"]).default("Inter"),
  radius: z.number().min(0).max(32).default(0),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum([
    "hero", "features", "logos", "stats", "testimonials", "pricing", "faq",
    "gallery", "cta", "contact", "steps", "divider",
  ]),
  props: z.record(z.string(), z.unknown()).default({}),
  styles: stylesSchema.default({}),
  responsive: z
    .object({
      mobile: stylesSchema.partial().optional(),
      tablet: stylesSchema.partial().optional(),
      desktop: stylesSchema.partial().optional(),
    })
    .partial()
    .optional(),
  animation: animationSchema.default({ effect: "none", durationSec: 0.7, delayMs: 0 }),
});

const pageSchema = z.object({
  id: z.string().min(1).max(80),
  slug: z.string().regex(/^\/([a-z0-9-]*)$/, "slug must start with / and be lowercase"),
  name: z.string().min(1).max(80),
  seo: seoSchema,
  sections: z.array(sectionSchema).max(40).default([]),
});

const websiteSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  metadata: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(400).default(""),
    logoUrl: z.string().max(2000).optional(),
    assets: z
      .array(z.object({ url: z.string().min(1), name: z.string().default(""), kind: z.enum(["image", "file"]).optional(), generated: z.boolean().optional() }))
      .default([]),
  }),
  theme: themeSchema,
  globalComponents: z.object({ navbar: navbarSchema, footer: footerSchema }),
  pages: z.array(pageSchema).min(1).max(25),
});

export type ParsedWebsite = z.infer<typeof websiteSchema>;

/* ── operation schema ─────────────────────────────────────────────────────── */

export const operationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("UPDATE_THEME"), patch: themeSchema.partial() }),
  z.object({
    op: z.literal("UPDATE_GLOBAL"),
    component: z.enum(["navbar", "footer"]),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({ op: z.literal("ADD_PAGE"), slug: z.string().regex(/^\/([a-z0-9-]*)$/), name: z.string().min(1).max(80), insertAt: z.number().int().optional() }),
  z.object({ op: z.literal("REMOVE_PAGE"), pageIndex: z.number().int().min(0) }),
  z.object({ op: z.literal("UPDATE_PAGE"), pageIndex: z.number().int().min(0), patch: z.object({ name: z.string().min(1).max(80).optional(), slug: z.string().regex(/^\/([a-z0-9-]*)$/).optional(), seo: seoSchema.partial().optional() }) }),
  z.object({ op: z.literal("ADD_SECTION"), pageIndex: z.number().int().min(0), type: sectionSchema.shape.type, insertAt: z.number().int().optional(), props: z.record(z.string(), z.unknown()).optional(), styles: stylesSchema.partial().optional() }),
  z.object({ op: z.literal("REMOVE_SECTION"), pageIndex: z.number().int().min(0), sectionIndex: z.number().int().min(0) }),
  z.object({ op: z.literal("MOVE_SECTION"), pageIndex: z.number().int().min(0), from: z.number().int().min(0), to: z.number().int().min(0) }),
  z.object({
    op: z.literal("UPDATE_SECTION"),
    pageIndex: z.number().int().min(0),
    sectionIndex: z.number().int().min(0),
    patch: z.record(z.string(), z.unknown()).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    styles: stylesSchema.partial().optional(),
    animation: animationSchema.partial().optional(),
    responsive: z.record(z.string(), stylesSchema.partial()).optional(),
  }),
  z.object({ op: z.literal("ADD_ASSET"), asset: z.object({ url: z.string().min(1).max(2000), name: z.string().max(200).default(""), kind: z.enum(["image", "file"]).optional(), generated: z.boolean().optional() }) }),
  z.object({ op: z.literal("REMOVE_ASSET"), url: z.string().min(1) }),
]);

export const patchSchema = z.object({
  ops: z.array(operationSchema).min(1).max(12),
});

export interface PatchResult {
  ok: true;
  data: WebsiteSchema;
  applied: Operation[];
}
export interface PatchFailure {
  ok: false;
  error: string;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Merge defaults for a section type into AI/provided props (deep-ish merge). */
export function mergeSectionProps(type: SectionType, props: Record<string, unknown>): Record<string, unknown> {
  const base = SECTION_DEFS[type].defaults().props;
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(base[k]) && Array.isArray(v)) {
      merged[k] = v.length ? v : base[k];
      continue;
    }
    if (typeof base[k] === "object" && base[k] !== null && typeof v === "object" && v !== null && !Array.isArray(v)) {
      merged[k] = { ...(base[k] as object), ...(v as object) };
      continue;
    }
    merged[k] = v;
  }
  return merged;
}

export const FONT_STACK: Record<string, string> = {
  "Space Grotesk": "'Space Grotesk', ui-sans-serif, sans-serif",
  Inter: "Inter, ui-sans-serif, sans-serif",
  Poppins: "Poppins, ui-sans-serif, sans-serif",
  Sora: "Sora, ui-sans-serif, sans-serif",
};

export const FALLBACK_THEME: Theme = {
  primaryColor: "#e11d48",
  background: "#0a0a0c",
  surface: "#141418",
  textColor: "#fafafa",
  mutedColor: "#9ca3af",
  headingFont: "Space Grotesk",
  bodyFont: "Inter",
  radius: 0,
};

export function defaultGlobalComponents(brand: string) {
  const footer: FooterConfig = {
    enabled: true,
    brand,
    copyright: `© ${new Date().getFullYear()} ${brand}. All rights reserved.`,
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Contact", href: "#" },
    ],
    social: true,
  };
  const navbar: NavbarConfig = {
    enabled: true,
    brand,
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
    cta: { label: "Get Started", href: "#cta" },
    sticky: true,
  };
  return { navbar, footer };
}

/** Fully parse + normalize arbitrary (e.g. AI-returned) input into a WebsiteSchema. */
export function normalizeWebsite(input: unknown): WebsiteSchema {
  const base = z
    .object({
      schemaVersion: z.literal(SCHEMA_VERSION).or(z.number()).default(SCHEMA_VERSION),
      metadata: z.object({
        name: z.string().min(1).max(80).default("Untitled"),
        description: z.string().max(400).default(""),
        logoUrl: z.string().max(2000).optional(),
        assets: z.array(z.record(z.string(), z.unknown())).default([]),
      }),
      theme: z.record(z.string(), z.unknown()).default({}),
      globalComponents: z
        .object({
          navbar: z.record(z.string(), z.unknown()).default({}),
          footer: z.record(z.string(), z.unknown()).default({}),
        })
        .default({ navbar: {}, footer: {} }),
      pages: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .parse(input);

  const theme = themeSchema.parse({ ...FALLBACK_THEME, ...base.theme }) as Theme;
  const metadata = websiteSchema.shape.metadata.parse(base.metadata);

  const brand = metadata.name;
  const globals = {
    navbar: navbarSchema.parse({ ...defaultGlobalComponents(brand).navbar, ...(base.globalComponents.navbar ?? {}) }),
    footer: footerSchema.parse({ ...defaultGlobalComponents(brand).footer, ...(base.globalComponents.footer ?? {}) }),
  };

  let pages: WebsiteSchema["pages"];
  try {
    pages = websiteSchema.shape.pages.parse(base.pages);
  } catch {
    // Repair pages from raw records — be tolerant about AI hallucinating shapes.
    pages = (base.pages as unknown[])
      .map((raw, i) => {
        const rec = (raw ?? {}) as Record<string, unknown>;
        const id = typeof rec.id === "string" && rec.id ? rec.id : `page-${i + 1}`;
        const slugRaw = typeof rec.slug === "string" ? rec.slug : i === 0 ? "/" : `/${(rec.name || `page-${i + 1}`).toString().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const slug = slugRaw.startsWith("/") ? slugRaw : `/${slugRaw}`;
        const name = (typeof rec.name === "string" && rec.name ? rec.name : rec.title as string) || `Page ${i + 1}`;
        const rawSections = Array.isArray(rec.sections) ? rec.sections : [];
        const sections = rawSections
          .filter((s) => typeof s === "object" && s !== null && typeof (s as Record<string, unknown>).type === "string")
          .map((s, j) => normalizeSectionRecord(s as Record<string, unknown>, i, j));
        return pageSchema.parse({ id, slug, name, seo: rec.seo ?? {}, sections });
      })
      .slice(0, 25);
    if (!pages.length) throw new Error("Website has no pages");
  }

  const normalized: WebsiteSchema = {
    schemaVersion: SCHEMA_VERSION,
    metadata,
    theme,
    globalComponents: globals,
    pages,
  };
  return websiteSchema.parse(normalized) as WebsiteSchema;
}

function normalizeSectionRecord(rec: Record<string, unknown>, _pi: number, si: number): Section {
  const type = (["hero", "features", "logos", "stats", "testimonials", "pricing", "faq", "gallery", "cta", "contact", "steps", "divider"] as const).includes(rec.type as never)
    ? (rec.type as SectionType)
    : "features";
  const defaults = SECTION_DEFS[type].defaults();
  const parsed = sectionSchema.parse({
    id: typeof rec.id === "string" && rec.id ? rec.id : `sec-${_pi}-${si}`,
    type,
    props: rec.props && typeof rec.props === "object" ? mergeSectionProps(type, rec.props as Record<string, unknown>) : defaults.props,
    styles: rec.styles && typeof rec.styles === "object" ? { ...defaults.styles, ...(rec.styles as object) } : defaults.styles,
    animation: rec.animation ?? { effect: "none", durationSec: 0.7, delayMs: 0 },
  });
  return parsed as Section;
}

/** Validate a website document strictly. */
export function validateWebsite(input: unknown): { ok: true; data: WebsiteSchema } | { ok: false; error: string } {
  const parsed = websiteSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, error: msg };
  }
  return { ok: true, data: parsed.data as unknown as WebsiteSchema };
}
