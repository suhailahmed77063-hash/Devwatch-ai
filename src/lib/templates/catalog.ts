import type { WebsiteSchema } from "@/types/website";
import { normalizeWebsite, defaultGlobalComponents } from "@/lib/website/schema";
import { createSection } from "@/lib/website/sections";

export interface TemplateMeta {
  slug: string;
  name: string;
  category: string;
  description: string;
  coverImage?: string;
  accent: string;
}

const IMG = {
  saas: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/133f4e6e5-1510-49bf-b9ee-69279fd4bd65.png",
  portfolio: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1ac1b33bb-7511-41a4-8ab8-680eb18d42ed.png",
  commerce: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/16e4fa0e8-93ef-446b-9665-70b1b9df377d.png",
  agency: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1662ff2cb-5c15-47f7-8ca5-3f2f47a886df.png",
  restaurant: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1b1491d07-09ea-4179-9bb4-f1e2ea887bec.png",
  blog: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1eb974110-22eb-441f-8e89-fc08b469a15b.png",
  landing: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/11c5fbeac-7459-43f9-be7a-00dbe2111a2d.png",
  dashboard: "https://image.qwenlm.ai/public_source/32b9210c-e03d-468c-9a90-d8e17e704c76/1ba333c7f-4972-4193-9c8c-208e032674fb.png",
};

export const TEMPLATE_METAS: TemplateMeta[] = [
  { slug: "saas", name: "SaaS", category: "SaaS", description: "Convertible landing page for a software startup", coverImage: IMG.saas, accent: "#e11d48" },
  { slug: "portfolio", name: "Portfolio", category: "Portfolio", description: "Showcase for creatives and engineers", coverImage: IMG.portfolio, accent: "#8b5cf6" },
  { slug: "ecommerce", name: "E-commerce", category: "E-commerce", description: "Storefront focused on product storytelling", coverImage: IMG.commerce, accent: "#f43f5e" },
  { slug: "agency", name: "Agency", category: "Agency", description: "Bold positioning for studios and agencies", coverImage: IMG.agency, accent: "#dc143c" },
  { slug: "restaurant", name: "Restaurant", category: "Restaurant", description: "Menu, reservations and atmosphere", coverImage: IMG.restaurant, accent: "#f97316" },
  { slug: "blog", name: "Blog", category: "Blog", description: "Publication layout with featured stories", coverImage: IMG.blog, accent: "#e11d48" },
  { slug: "landing", name: "Landing Page", category: "Landing Page", description: "Single-purpose high-conversion page", coverImage: IMG.landing, accent: "#3b82f6" },
  { slug: "dashboard", name: "Dashboard", category: "Dashboard", description: "Product site for data-driven tools", coverImage: IMG.dashboard, accent: "#10b981" },
];

interface CatContent {
  brand: string;
  badge: string;
  h1: string;
  h2: string;
  sub: string;
  cta: string;
  secCta: string;
  featTitle: string;
  featWord: string;
  featSub: string;
  features: { icon: string; title: string; desc: string }[];
  logoTitle: string;
  stat1: [string, string];
  stat2: [string, string];
  stat3: [string, string];
  testiTitle: string;
  testiWord: string;
  priceTitle: string;
  priceWord: string;
  tiers: { name: string; price: string; desc: string; feats: string[]; highlight?: boolean }[];
  faqTitle: string;
  faqWord: string;
  faqs: { q: string; a: string }[];
  gallery: { title: string; desc: string }[];
  galleryTitle: string;
  galleryWord: string;
  ctaTitle: string;
  ctaWord: string;
  ctaSub: string;
  ctaBtn: string;
}

const C: Record<string, CatContent> = {
  SaaS: {
    brand: "FlowMetrics", badge: "New — FlowMetrics 2.0 is here", h1: "Scale smarter,", h2: "not harder",
    sub: "Real-time product analytics that turn noisy data into the decisions that grow your business.",
    cta: "Start free trial", secCta: "Watch demo",
    featTitle: "Everything you need", featWord: "to move faster", featSub: "One platform, zero busywork.",
    features: [
      { icon: "BarChart3", title: "Live dashboards", desc: "Metrics that update in real time as your users act." },
      { icon: "Zap", title: "Instant alerts", desc: "Anomaly detection that pings you before problems compound." },
      { icon: "Shield", title: "Enterprise security", desc: "SOC 2, SSO and granular roles baked in." },
      { icon: "Workflow", title: "Powerful automation", desc: "Route insights into Slack, webhooks or your CRM." },
    ],
    logoTitle: "Trusted by teams at",
    stat1: ["12k+", "Active teams"], stat2: ["99.9%", "Uptime SLA"], stat3: ["4.9★", "User rating"],
    testiTitle: "Loved by", testiWord: "thousands",
    priceTitle: "Simple", priceWord: "pricing",
    tiers: [
      { name: "Starter", price: "$0", desc: "For side projects", feats: ["3 projects", "Basic dashboards", "Community support"] },
      { name: "Pro", price: "$24", desc: "For growing teams", feats: ["Unlimited projects", "Anomaly alerts", "Automations", "Priority support"], highlight: true },
      { name: "Scale", price: "$99", desc: "For serious volume", feats: ["Everything in Pro", "SSO / SAML", "99.99% SLA"] },
    ],
    faqTitle: "Frequently asked", faqWord: "questions",
    faqs: [
      { q: "How long does setup take?", a: "Under five minutes — connect your data source and FlowMetrics does the rest." },
      { q: "Can I cancel anytime?", a: "Yes, plans are month-to-month and you can cancel in one click." },
      { q: "Do you offer a discount for startups?", a: "We partner with accelerator programs — email us to check eligibility." },
    ],
    galleryTitle: "", galleryWord: "", gallery: [],
    ctaTitle: "Ready to", ctaWord: "get started?", ctaSub: "Join 12,000+ teams already building with FlowMetrics.", ctaBtn: "Create free account",
  },
  Portfolio: {
    brand: "Alex Rivera", badge: "Available for freelance — 2026", h1: "Creative work,", h2: "crafted with care",
    sub: "I'm Alex — a product engineer and designer helping founders turn fuzzy ideas into shipped products.",
    cta: "View my work", secCta: "Get in touch",
    featTitle: "What I", featWord: "do best", featSub: "Full-stack product work from concept to launch.",
    features: [
      { icon: "PenTool", title: "Product design", desc: "Interfaces that feel obvious and systems that scale." },
      { icon: "Code2", title: "Engineering", desc: "TypeScript, React and Node — clean and testable." },
      { icon: "Rocket", title: "Launch", desc: "From repo to production with observability built in." },
    ],
    logoTitle: "I've worked with",
    stat1: ["8+", "Years experience"], stat2: ["40+", "Products shipped"], stat3: ["12", "Design awards"],
    testiTitle: "What clients", testiWord: "say",
    priceTitle: "Ways to", priceWord: "work",
    tiers: [
      { name: "Consult", price: "$150", desc: "Per hour", feats: ["Advice on architecture", "Design critiques", "No commitment"] },
      { name: "Build", price: "$6k", desc: "Per sprint", feats: ["Design + development", "Weekly demos", "2 week sprints"], highlight: true },
      { name: "Partner", price: "Custom", desc: "Long term", feats: ["Embedded team member", "Product strategy", "Equity options"] },
    ],
    faqTitle: "", faqWord: "", faqs: [],
    galleryTitle: "Selected", galleryWord: "work",
    gallery: [
      { title: "Nimbus — analytics suite", desc: "Product design + React frontend" },
      { title: "Ember — booking platform", desc: "Full-stack build, 0→1" },
      { title: "Looply — dev tool", desc: "Design system + web app" },
      { title: "Kite — mobile app", desc: "UX research + product design" },
    ],
    ctaTitle: "Have a project", ctaWord: "in mind?", ctaSub: "Tell me about it — I reply within 24 hours.", ctaBtn: "Start a conversation",
  },
  "E-commerce": {
    brand: "VELOCE", badge: "Free shipping over $150", h1: "Step into", h2: "luxury",
    sub: "Hand-finished leather goods, built to outlive trends. Every piece is made to order in small batches.",
    cta: "Shop new arrivals", secCta: "Our story",
    featTitle: "Why VELOCE", featWord: "lasts", featSub: "Materials, craft and service you can feel.",
    features: [
      { icon: "Leaf", title: "Responsible materials", desc: "Vegetable-tanned leather from certified tanneries." },
      { icon: "Hand", title: "Handcrafted", desc: "Each piece finished by one artisan, start to end." },
      { icon: "RefreshCcw", title: "Lifetime repairs", desc: "We repair our products free, forever." },
    ],
    logoTitle: "As seen in",
    stat1: ["50k+", "Happy customers"], stat2: ["4.8★", "Average rating"], stat3: ["12", "Countries shipped"],
    testiTitle: "Customer", testiWord: "stories",
    priceTitle: "The", priceWord: "collection",
    tiers: [
      { name: "Card Holder", price: "$89", desc: "Slim, 4 slots", feats: ["Italian leather", "RFID lining", "Monogram option"] },
      { name: "Weekender", price: "$420", desc: "Signature bag", feats: ["Hand-stitched", "Solid brass", "Lifetime repairs"], highlight: true },
      { name: "Belt", price: "$120", desc: "Full-grain", feats: ["Made to your size", "Buckle in 3 finishes"] },
    ],
    faqTitle: "Shipping &", faqWord: "returns",
    faqs: [
      { q: "How long does shipping take?", a: "Orders ship in 2–4 business days; worldwide delivery in 5–10." },
      { q: "What is your return policy?", a: "30 days, no questions asked. Repairs are lifetime." },
      { q: "Can I get it monogrammed?", a: "Yes — add initials at checkout and we'll emboss them free." },
    ],
    galleryTitle: "The", galleryWord: "collection",
    gallery: [
      { title: "The Weekender", desc: "Our signature overnight bag" },
      { title: "Card Holder", desc: "Slim carry, Italian leather" },
      { title: "Travel Case", desc: "Organized essentials for trips" },
      { title: "The Belt", desc: "Full-grain, made to measure" },
    ],
    ctaTitle: "Join the", ctaWord: "waitlist", ctaSub: "Be first to hear about limited drops and new colors.", ctaBtn: "Notify me",
  },
  Agency: {
    brand: "Studio Noir", badge: "Now booking Q3 2026", h1: "Bold ideas,", h2: "bolder work",
    sub: "A full-service creative studio for brands that refuse to blend in. Strategy, design and engineering under one roof.",
    cta: "Start a project", secCta: "See our work",
    featTitle: "What we", featWord: "offer", featSub: "End-to-end capability, senior-only teams.",
    features: [
      { icon: "Palette", title: "Brand & identity", desc: "Positioning, voice and visual systems that stick." },
      { icon: "MousePointer2", title: "Web experiences", desc: "Award-level sites engineered for conversion." },
      { icon: "TrendingUp", title: "Growth strategy", desc: "Campaigns measured against revenue, not likes." },
    ],
    logoTitle: "Clients",
    stat1: ["120+", "Brands launched"], stat2: ["$2.4B", "Client revenue"], stat3: ["27", "Design awards"],
    testiTitle: "Client", testiWord: "love",
    priceTitle: "Engagement", priceWord: "models",
    tiers: [
      { name: "Sprint", price: "$9k", desc: "2 weeks, focused", feats: ["1 clear problem", "Design or build", "Senior team"] },
      { name: "Engagement", price: "$24k", desc: "Quarterly partner", feats: ["Strategy + design + build", "Dedicated pod", "Weekly demos"], highlight: true },
      { name: "Retainer", price: "Custom", desc: "Ongoing", feats: ["Full studio access", "Same-day response", "Growth roadmap"] },
    ],
    faqTitle: "", faqWord: "", faqs: [],
    galleryTitle: "Selected", galleryWord: "work",
    gallery: [
      { title: "Framewrk — rebrand", desc: "Identity + site for a dev platform" },
      { title: "Umbra — launch", desc: "Campaign site for a hardware startup" },
      { title: "Kite — e-commerce", desc: "Headless storefront, +180% conversion" },
    ],
    ctaTitle: "Tell us about", ctaWord: "your project", ctaSub: "Free 30-minute strategy call, no pressure.", ctaBtn: "Book a call",
  },
  Restaurant: {
    brand: "Ember & Oak", badge: "Open tonight 5–11pm", h1: "Fire-kissed", h2: "cuisine",
    sub: "Seasonal plates from an open-fire kitchen in the heart of town. Reservations recommended.",
    cta: "Reserve a table", secCta: "View menu",
    featTitle: "The Ember & Oak", featWord: "experience", featSub: "Why guests keep coming back.",
    features: [
      { icon: "Flame", title: "Wood-fired", desc: "Everything passes over live oak embers." },
      { icon: "Wheat", title: "Seasonal menu", desc: "Foraged and farmed within 100 miles." },
      { icon: "Wine", title: "Natural wines", desc: "A rotating list of small growers." },
    ],
    logoTitle: "Featured in",
    stat1: ["4.9★", "1,200+ reviews"], stat2: ["14", "Courses on the fire"], stat3: ["2019", "Opening year"],
    testiTitle: "Guest", testiWord: "words",
    priceTitle: "Dinner", priceWord: "menu",
    tiers: [
      { name: "Tasting", price: "$85", desc: "7 courses", feats: ["Fire-kissed tasting", "Optional wine pairing", "Dietary friendly"] },
      { name: "Chef's Counter", price: "$125", desc: "10 courses", feats: ["Front-row seats", "Extended menu", "Wine pairing"], highlight: true },
      { name: "Sunday Roast", price: "$45", desc: "Lunch, 3 courses", feats: ["Family style", "Kids under 10 free"] },
    ],
    faqTitle: "Good to", faqWord: "know",
    faqs: [
      { q: "Do you accommodate allergies?", a: "Absolutely — tell us when booking and we'll plan around them." },
      { q: "Is there a dress code?", a: "Smart casual. Come as you are, fire-singed is welcome." },
      { q: "Can we book the private room?", a: "The Cellar seats 14 — email us at least two weeks ahead." },
    ],
    galleryTitle: "From the", galleryWord: "kitchen",
    gallery: [
      { title: "Ember-roasted carrots", desc: "Brown butter, hazelnut" },
      { title: "The whole fish", desc: "Oak fire, salsa verde" },
      { title: "Baba au rhum", desc: "Our famous dessert" },
      { title: "The Cellar", desc: "Private dining for 14" },
    ],
    ctaTitle: "Hungry", ctaWord: "yet?", ctaSub: "Book your table — weekends go fast.", ctaBtn: "Reserve now",
  },
  Blog: {
    brand: "The Signal", badge: "New issue every Tuesday", h1: "Stories that", h2: "resonate",
    sub: "Essays on technology, culture and the people building the future — from the writers you actually trust.",
    cta: "Start reading", secCta: "Subscribe free",
    featTitle: "Why read", featWord: "The Signal", featSub: "Independent, thoughtful, never paywalled.",
    features: [
      { icon: "PenLine", title: "Original essays", desc: "Long-form writing edited by humans, not algorithms." },
      { icon: "Podcast", title: "The Signal Podcast", desc: "Conversations with the builders behind the headlines." },
      { icon: "Bell", title: "Weekly digest", desc: "The five stories worth your time, every Sunday." },
    ],
    logoTitle: "Readers at",
    stat1: ["80k", "Weekly readers"], stat2: ["0", "Trackers or ads"], stat3: ["12", "Writers on staff"],
    testiTitle: "Reader", testiWord: "letters",
    priceTitle: "Membership", priceWord: "plans",
    tiers: [
      { name: "Reader", price: "$0", desc: "Everything free", feats: ["All essays", "Weekly digest", "Community comments"] },
      { name: "Member", price: "$6", desc: "Support us", feats: ["Everything free", "Ad-free app", "Members-only podcast", "No paywall, ever"], highlight: true },
      { name: "Patron", price: "$25", desc: "Go further", feats: ["Everything in Member", "Quarterly print issue", "Live AMAs"] },
    ],
    faqTitle: "About the", faqWord: "publication",
    faqs: [
      { q: "Is The Signal really free?", a: "Yes — reader-funded by choice. Members keep us independent." },
      { q: "Can I pitch a story?", a: "We read every pitch — guidelines live on the About page." },
      { q: "Where does the print issue ship?", a: "Worldwide, every quarter, on heavy paper." },
    ],
    galleryTitle: "Latest", galleryWord: "stories",
    gallery: [
      { title: "The quiet return of local software", desc: "Feature · 18 min" },
      { title: "What good metrics feel like", desc: "Essay · 9 min" },
      { title: "Inside the indie chip lab", desc: "Report · 22 min" },
      { title: "The case for boring design", desc: "Essay · 11 min" },
    ],
    ctaTitle: "Never miss a", ctaWord: "story", ctaSub: "Join 80,000 readers. Free, every Sunday.", ctaBtn: "Subscribe free",
  },
  "Landing Page": {
    brand: "LaunchPad", badge: "Early access — 200 spots left", h1: "Accelerate", h2: "your growth",
    sub: "The go-to-market toolkit that turns your launch into a motion machine. Built for teams shipping in weeks, not quarters.",
    cta: "Get early access", secCta: "See how it works",
    featTitle: "Launch", featWord: "faster", featSub: "Everything your launch needs, wired together.",
    features: [
      { icon: "Rocket", title: "Waitlist engine", desc: "Capture demand before day one with referral mechanics." },
      { icon: "Mail", title: "Drip campaigns", desc: "Pre-built sequences that convert signups into users." },
      { icon: "Share2", title: "Launch analytics", desc: "Know which channels actually moved the needle." },
    ],
    logoTitle: "Launch partners",
    stat1: ["3,400", "Teams on the list"], stat2: ["92%", "Open rate"], stat3: ["4.1×", "Avg. referral factor"],
    testiTitle: "Early", testiWord: "signal",
    priceTitle: "", priceWord: "",
    tiers: [],
    faqTitle: "", faqWord: "",
    faqs: [
      { q: "When does LaunchPad open to everyone?", a: "We onboard the waitlist in waves starting next month." },
      { q: "Who is it for?", a: "Product teams running launches, migrations or feature releases." },
      { q: "Is there a free plan?", a: "Yes — the free plan covers a single launch." },
    ],
    galleryTitle: "", galleryWord: "", gallery: [],
    ctaTitle: "Get your spot", ctaWord: "in line", ctaSub: "Early access members get 3 months free after launch.", ctaBtn: "Join the waitlist",
  },
  Dashboard: {
    brand: "PulseBoard", badge: "New — health scoring is live", h1: "Data that", h2: "drives decisions",
    sub: "PulseBoard unifies your product, support and sales signals into one board your whole team actually checks.",
    cta: "Try PulseBoard", secCta: "Watch the tour",
    featTitle: "One board,", featWord: "every signal", featSub: "Stop stitching reports together.",
    features: [
      { icon: "Activity", title: "Health scoring", desc: "Know which accounts are thriving or at risk — before renewals." },
      { icon: "Zap", title: "Live metrics", desc: "Product, support and revenue in a single refresh." },
      { icon: "Users", title: "Team views", desc: "Shared context from execs to engineers." },
    ],
    logoTitle: "Powering teams at",
    stat1: ["2,400", "Companies"], stat2: ["38M", "Events/day"], stat3: ["99.99%", "Uptime"],
    testiTitle: "Teams that", testiWord: "switched",
    priceTitle: "Plans that", priceWord: "scale",
    tiers: [
      { name: "Team", price: "$0", desc: "Up to 5 seats", feats: ["3 boards", "Basic health scores", "Community support"] },
      { name: "Business", price: "$49", desc: "Growing teams", feats: ["Unlimited boards", "Advanced scoring", "Integrations", "Priority support"], highlight: true },
      { name: "Enterprise", price: "Custom", desc: "Security & scale", feats: ["SSO / SAML", "Audit logs", "99.99% SLA"] },
    ],
    faqTitle: "Frequently asked", faqWord: "questions",
    faqs: [
      { q: "How long does it take to connect?", a: "Most teams see their first board in under 10 minutes." },
      { q: "What integrations exist?", a: "Stripe, Intercom, Segment, GitHub and 40+ more via API." },
      { q: "Is my data secure?", a: "Encrypted in transit and at rest, with SSO on Business+" },
    ],
    galleryTitle: "", galleryWord: "", gallery: [],
    ctaTitle: "See your company", ctaWord: "clearly", ctaSub: "Free 14-day Business trial, no card required.", ctaBtn: "Start free trial",
  },
};

function slugName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "home";
  return slug;
}

/** Build the full WebsiteSchema for a template category. */
export function buildTemplateSite(category: string, accentOverride?: string): WebsiteSchema {
  const c = C[category] ?? C.SaaS;
  const theme = {
    primaryColor: accentOverride ?? (TEMPLATE_METAS.find((t) => t.category === category)?.accent ?? "#e11d48"),
    background: "#0a0a0c",
    surface: "#141418",
    textColor: "#fafafa",
    mutedColor: "#9ca3af",
    headingFont: "Space Grotesk" as const,
    bodyFont: "Inter" as const,
    radius: 0,
  };

  const home = {
    id: "home",
    slug: "/",
    name: "Home",
    seo: {
      title: `${c.brand} — ${c.sub.slice(0, 60)}`,
      description: c.sub.slice(0, 155),
      jsonLd: [{ "@type": "WebSite", "@context": "https://schema.org", name: c.brand, description: c.sub.slice(0, 200) }],
    },
    sections: [],
  };

  const push = (sect: ReturnType<typeof createSection>) => {
    (home.sections as unknown[]).push(sect);
  };

  push(
    createSection("hero", {
      props: {
        badge: c.badge,
        lines: [{ text: c.h1, accent: false }, { text: c.h2, accent: true }],
        sub: c.sub,
        primaryCta: { label: c.cta, href: "#" },
        secondaryCta: { label: c.secCta, href: "#" },
        size: "lg",
      },
      styles: { paddingY: 60, maxWidth: 94, textAlign: "center", background: { mode: "glow" }, radius: 0 },
      animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
    })
  );

  push(createSection("logos", { props: { title: c.logoTitle, items: [{ name: "Acme Corp" }, { name: "Globex" }, { name: "Umbra" }, { name: "Vertex" }, { name: "Nimbus" }] }, styles: { paddingY: 22, maxWidth: 94, textAlign: "center" } }));

  if (c.features.length) {
    push(createSection("features", {
      props: { title: c.featTitle, accentWord: c.featWord, sub: c.featSub, items: c.features },
      styles: { paddingY: 56, maxWidth: 94, textAlign: "center", gap: 16 },
      animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
    }));
  }

  push(createSection("stats", { props: { items: [{ value: c.stat1[0], label: c.stat1[1] }, { value: c.stat2[0], label: c.stat2[1] }, { value: c.stat3[0], label: c.stat3[1] }] }, styles: { paddingY: 34, maxWidth: 94, textAlign: "center", background: { mode: "glass" } } }));

  if (c.gallery.length) {
    push(createSection("gallery", {
      props: {
        title: c.galleryTitle, accentWord: c.galleryWord,
        sub: "",
        items: c.gallery.map((g) => ({ image: "", ...g })),
      },
      styles: { paddingY: 56, maxWidth: 94, textAlign: "center", gap: 16 },
      animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
    }));
  }

  push(createSection("testimonials", {
    props: {
      title: c.testiTitle, accentWord: c.testiWord, sub: "",
      items: [
        { quote: "The easiest decision our team made this year. Setup took minutes and the results speak for themselves.", name: "Jordan Delgado", role: "VP Product" },
        { quote: "It just works — polished, fast and reliable. We've recommended it to everyone we know.", name: "Amara Lawson", role: "Founder" },
      ],
    },
    styles: { paddingY: 56, maxWidth: 94, textAlign: "center", gap: 16 },
    animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
  }));

  if (c.tiers.length) {
    push(createSection("pricing", {
      props: { title: c.priceTitle, accentWord: c.priceWord, sub: "", items: c.tiers.map((t) => ({ ...t, period: t.price === "$0" ? "/forever" : "/mo", ctaLabel: t.highlight ? "Choose plan" : "Get started" })) },
      styles: { paddingY: 60, maxWidth: 94, textAlign: "center", gap: 16, background: { mode: "glass" } },
      animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
    }));
  }

  if (c.faqs.length) {
    push(createSection("faq", { props: { title: c.faqTitle, accentWord: c.faqWord, items: c.faqs }, styles: { paddingY: 56, maxWidth: 80, textAlign: "left", gap: 10 } }));
  }

  push(createSection("cta", {
    props: { title: c.ctaTitle, accentWord: c.ctaWord, sub: c.ctaSub, button: { label: c.ctaBtn, href: "#" } },
    styles: { paddingY: 64, maxWidth: 94, textAlign: "center", background: { mode: "glow" } },
    animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 },
  }));

  const raw: WebsiteSchema = {
    schemaVersion: 1,
    metadata: { name: c.brand, description: c.sub.slice(0, 300), assets: [] },
    theme,
    globalComponents: {
      ...defaultGlobalComponents(c.brand),
      navbar: { ...defaultGlobalComponents(c.brand).navbar, links: category === "Restaurant" ? [{ label: "Menu", href: "#menu" }, { label: "About", href: "#about" }, { label: "Visit", href: "#visit" }] : [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }], cta: { label: c.cta, href: "#" } },
    },
    pages: [home],
  };

  const norm = normalizeWebsite(raw);
  return norm;
}

/** slug used for template subdomains on instantiation */
export function brandSlug(brand: string): string {
  return slugName(brand);
}

export function templateCover(category: string): string | undefined {
  return TEMPLATE_METAS.find((t) => t.category === category)?.coverImage;
}
