import type { Section, SectionStyles, SectionType } from "@/types/website";

export interface SectionDef {
  type: SectionType;
  label: string;
  icon: string; // lucide icon name
  desc: string;
  /** generate a fresh set of default props + styles */
  defaults: () => { props: Record<string, unknown>; styles: SectionStyles };
}

const pad = (n = 44): SectionStyles => ({
  paddingY: n,
  paddingX: 0,
  maxWidth: 94,
  textAlign: "left",
  radius: 0,
  background: { mode: "none" },
  gap: 14,
  shadow: false,
  opacity: 1,
});

export const SECTION_DEFS: Record<SectionType, SectionDef> = {
  hero: {
    type: "hero",
    label: "Hero",
    icon: "Sparkle",
    desc: "Headline, subcopy and calls to action",
    defaults: () => ({
      props: {
        badge: "New — product 2.0 is here",
        lines: [{ text: "Build smarter with", accent: false }, { text: "AI intelligence", accent: true }],
        sub: "Describe the main value proposition in one or two sentences that visitors understand instantly.",
        primaryCta: { label: "Get Started", href: "#" },
        secondaryCta: { label: "Watch demo", href: "#" },
        size: "lg",
      },
      styles: { ...pad(56), background: { mode: "glow" }, textAlign: "center" },
    }),
  },
  features: {
    type: "features",
    label: "Features",
    icon: "LayoutGrid",
    desc: "Grid of capabilities with icons",
    defaults: () => ({
      props: {
        title: "Everything you need",
        accentWord: "to move faster",
        sub: "A short supporting paragraph about why these features matter.",
        items: [
          { icon: "Zap", title: "Lightning fast", desc: "Sub-second responses powered by a global edge network." },
          { icon: "Shield", title: "Secure by default", desc: "Encryption at rest and granular access controls." },
          { icon: "BarChart3", title: "Deep analytics", desc: "Real-time dashboards that turn data into decisions." },
        ],
      },
      styles: pad(52),
    }),
  },
  logos: {
    type: "logos",
    label: "Logo Cloud",
    icon: "Building2",
    desc: "Social proof logo strip",
    defaults: () => ({
      props: {
        title: "Trusted by teams at",
        items: [{ name: "Acme Corp" }, { name: "Globex" }, { name: "Umbra" }, { name: "Vertex" }],
      },
      styles: { ...pad(24), textAlign: "center" },
    }),
  },
  stats: {
    type: "stats",
    label: "Stats",
    icon: "TrendingUp",
    desc: "Numbers that prove the point",
    defaults: () => ({
      props: {
        items: [
          { value: "12k+", label: "Active teams" },
          { value: "99.9%", label: "Uptime SLA" },
          { value: "4.9★", label: "User rating" },
        ],
      },
      styles: { ...pad(40), textAlign: "center" },
    }),
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    icon: "MessageSquareQuote",
    desc: "Social proof quotes",
    defaults: () => ({
      props: {
        title: "Loved by",
        accentWord: "thousands",
        sub: "What real customers say.",
        items: [
          { quote: "This product changed how our team works. Incredible.", name: "Jordan D.", role: "Ops Lead" },
          { quote: "Onboarding took minutes. The results are genuinely magical.", name: "Ana L.", role: "Product" },
        ],
      },
      styles: { ...pad(52), background: { mode: "glass" } },
    }),
  },
  pricing: {
    type: "pricing",
    label: "Pricing",
    icon: "Tags",
    desc: "Plan tiers with features",
    defaults: () => ({
      props: {
        title: "Simple",
        accentWord: "pricing",
        sub: "Start free, upgrade when you grow.",
        items: [
          { name: "Starter", price: "$0", period: "/mo", desc: "For trying things out", features: ["Feature one", "Feature two", "Community support"], highlight: false, ctaLabel: "Start free" },
          { name: "Pro", price: "$24", period: "/mo", desc: "For growing teams", features: ["Feature one", "Feature two", "Feature three", "Priority support"], highlight: true, ctaLabel: "Go Pro" },
          { name: "Scale", price: "$99", period: "/mo", desc: "For serious volume", features: ["Everything in Pro", "Custom onboarding"], highlight: false, ctaLabel: "Contact us" },
        ],
      },
      styles: { ...pad(56), background: { mode: "glass" } },
    }),
  },
  faq: {
    type: "faq",
    label: "FAQ",
    icon: "HelpCircle",
    desc: "Collapsible questions",
    defaults: () => ({
      props: {
        title: "Frequently asked",
        accentWord: "questions",
        items: [
          { q: "How long does setup take?", a: "Minutes — onboarding is fully guided and automatic." },
          { q: "Can I cancel anytime?", a: "Yes, upgrade or cancel from billing at any time." },
        ],
      },
      styles: pad(52),
    }),
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    icon: "Images",
    desc: "Image grid (portfolio, blog, products)",
    defaults: () => ({
      props: {
        title: "Selected",
        accentWord: "work",
        sub: "A visual showcase.",
        items: [
          { image: "", title: "Project one", desc: "Short description" },
          { image: "", title: "Project two", desc: "Short description" },
        ],
      },
      styles: { ...pad(52), background: { mode: "glass" } },
    }),
  },
  cta: {
    type: "cta",
    label: "Call to Action",
    icon: "Megaphone",
    desc: "Final conversion band",
    defaults: () => ({
      props: {
        title: "Ready to",
        accentWord: "get started?",
        sub: "Join thousands of teams building with us.",
        button: { label: "Create free account", href: "#" },
      },
      styles: { ...pad(56), textAlign: "center", background: { mode: "glow" } },
    }),
  },
  contact: {
    type: "contact",
    label: "Contact",
    icon: "Mail",
    desc: "Contact details + form",
    defaults: () => ({
      props: {
        title: "Get in",
        accentWord: "touch",
        sub: "We reply within one business day.",
        email: "hello@example.com",
        showForm: true,
      },
      styles: { ...pad(52), background: { mode: "glass" } },
    }),
  },
  steps: {
    type: "steps",
    label: "How it works",
    icon: "ListOrdered",
    desc: "Numbered process steps",
    defaults: () => ({
      props: {
        title: "How it",
        accentWord: "works",
        items: [
          { title: "Sign up", desc: "Create your free account in seconds." },
          { title: "Describe", desc: "Tell the AI what you want to build." },
          { title: "Launch", desc: "Publish to a live URL with one click." },
        ],
      },
      styles: { ...pad(52), textAlign: "center" },
    }),
  },
  divider: {
    type: "divider",
    label: "Divider",
    icon: "Minus",
    desc: "Simple horizontal separator",
    defaults: () => ({ props: { height: 40 }, styles: { ...pad(0), maxWidth: 80 } }),
  },
};

export const SECTION_TYPES = Object.keys(SECTION_DEFS) as SectionType[];

/** Create a fully initialized section of a given type with unique id. */
export function createSection(type: SectionType, overrides?: Partial<Section>): Section {
  const d = SECTION_DEFS[type].defaults();
  return {
    id: `sec-${Math.random().toString(36).slice(2, 10)}`,
    type,
    props: d.props,
    styles: d.styles,
    animation: { effect: "none", durationSec: 0.7, delayMs: 0 },
    ...overrides,
  };
}
