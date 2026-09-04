/**
 * WebForge AI — internal structured website representation.
 *
 * The source of truth for every project is one of these documents (stored on
 * Project.currentSchema / ProjectVersion.schema). Sections render from this
 * JSON deterministically — never from stored raw HTML.
 */

export type SectionType =
  | "hero"
  | "features"
  | "logos"
  | "stats"
  | "testimonials"
  | "pricing"
  | "faq"
  | "gallery"
  | "cta"
  | "contact"
  | "steps"
  | "divider";

export type Device = "mobile" | "tablet" | "desktop";

export interface NavLink {
  label: string;
  href: string;
}

export interface Cta {
  label: string;
  href: string;
}

export interface NavbarConfig {
  enabled: boolean;
  brand: string;
  links: NavLink[];
  cta: Cta;
  sticky: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  brand: string;
  copyright: string;
  links: NavLink[];
  social: boolean;
}

export interface GlobalComponents {
  navbar: NavbarConfig;
  footer: FooterConfig;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  /** JSON-LD structured data objects */
  jsonLd?: Record<string, unknown>[];
}

export interface PageSeo extends SeoMeta {}

export interface BackgroundStyle {
  mode: "none" | "solid" | "glass" | "glow" | "image";
  color?: string;
  imageUrl?: string;
}

export interface SectionStyles {
  /** vertical padding px */
  paddingY?: number;
  /** horizontal padding px */
  paddingX?: number;
  /** container max width (%) */
  maxWidth?: number;
  textAlign?: "left" | "center" | "right";
  radius?: number;
  background?: BackgroundStyle;
  gap?: number;
  shadow?: boolean;
  opacity?: number;
}

export interface SectionAnimation {
  effect: "fadeUp" | "none";
  durationSec: number;
  delayMs: number;
}

export interface Section {
  id: string;
  type: SectionType;
  /** type-specific content */
  props: Record<string, unknown>;
  styles: SectionStyles;
  /** device overrides merged on top of base styles */
  responsive?: Partial<Record<Device, Partial<SectionStyles>>>;
  animation: SectionAnimation;
}

export interface Page {
  id: string;
  slug: string; // "/" for home, "/about", ...
  name: string;
  seo: PageSeo;
  sections: Section[];
}

export interface Theme {
  primaryColor: string;
  background: string;
  surface: string;
  textColor: string;
  mutedColor?: string;
  headingFont: "Space Grotesk" | "Inter" | "Poppins" | "Sora";
  bodyFont: "Inter" | "Space Grotesk" | "Poppins" | "Sora";
  radius: number;
}

export interface WebsiteAssetRef {
  url: string;
  name: string;
  kind?: "image" | "file";
  generated?: boolean;
}

export interface SiteMetadata {
  name: string;
  description: string;
  /** site-wide favicon / logo url */
  logoUrl?: string;
  assets: WebsiteAssetRef[];
}

export const SCHEMA_VERSION = 1;

export interface WebsiteSchema {
  schemaVersion: typeof SCHEMA_VERSION;
  metadata: SiteMetadata;
  theme: Theme;
  globalComponents: GlobalComponents;
  pages: Page[];
}

export type WebsitePatch = Operation[];

export type Operation =
  | { op: "UPDATE_THEME"; patch: Partial<Theme> }
  | { op: "UPDATE_GLOBAL"; component: "navbar" | "footer"; patch: Partial<NavbarConfig> & Partial<FooterConfig> }
  | { op: "ADD_PAGE"; slug: string; name: string; insertAt?: number }
  | { op: "REMOVE_PAGE"; pageIndex: number }
  | { op: "UPDATE_PAGE"; pageIndex: number; patch: { name?: string; slug?: string; seo?: Partial<PageSeo> } }
  | { op: "ADD_SECTION"; pageIndex: number; type: SectionType; insertAt?: number; props?: Record<string, unknown>; styles?: Partial<SectionStyles> }
  | { op: "REMOVE_SECTION"; pageIndex: number; sectionIndex: number }
  | { op: "MOVE_SECTION"; pageIndex: number; from: number; to: number }
  | {
      op: "UPDATE_SECTION";
      pageIndex: number;
      sectionIndex: number;
      patch?: Record<string, unknown>;
      props?: Record<string, unknown>;
      styles?: Partial<SectionStyles>;
      animation?: Partial<SectionAnimation>;
      responsive?: Partial<Record<Device, Partial<SectionStyles>>>;
    }
  | { op: "ADD_ASSET"; asset: WebsiteAssetRef }
  | { op: "REMOVE_ASSET"; url: string };

/** Rich section props — plain typed views over `Section.props` */
export interface SectionPropsMap {
  hero: {
    badge?: string;
    lines: { text: string; accent?: boolean }[];
    sub?: string;
    primaryCta?: Cta;
    secondaryCta?: Cta;
    size?: "md" | "lg";
  };
  features: {
    title?: string;
    accentWord?: string;
    sub?: string;
    items: { icon: string; title: string; desc: string }[];
  };
  logos: { title?: string; items: { name: string }[] };
  stats: { items: { value: string; label: string }[] };
  testimonials: {
    title?: string;
    accentWord?: string;
    sub?: string;
    items: { quote: string; name: string; role: string }[];
  };
  pricing: {
    title?: string;
    accentWord?: string;
    sub?: string;
    items: {
      name: string;
      price: string;
      period?: string;
      desc: string;
      features: string[];
      highlight?: boolean;
      ctaLabel?: string;
    }[];
  };
  faq: { title?: string; accentWord?: string; items: { q: string; a: string }[] };
  gallery: {
    title?: string;
    accentWord?: string;
    sub?: string;
    items: { image: string; title?: string; desc?: string }[];
  };
  cta: { title?: string; accentWord?: string; sub?: string; button?: Cta };
  contact: {
    title?: string;
    accentWord?: string;
    sub?: string;
    email?: string;
    showForm: boolean;
    fields?: string[];
  };
  steps: {
    title?: string;
    accentWord?: string;
    items: { title: string; desc: string }[];
  };
  divider: { height?: number };
}

export type SectionPropsOf<T extends SectionType> = SectionPropsMap[T];
