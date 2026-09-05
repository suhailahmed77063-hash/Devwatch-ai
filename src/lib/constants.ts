import type { Plan } from "@prisma/client";

export const APP_NAME = "WebForge AI";
export const APP_TAGLINE = "Build websites with AI";

export const PLANS: Record<
  Plan,
  {
    label: string;
    priceMonthly: number | null;
    aiGenerationsPerMonth: number;
    appGenerationsPerMonth: number;
    publishedProjects: number;
    customDomains: boolean;
    aiImages: boolean;
    advancedSeo: boolean;
    codeExport: boolean;
    teamSeats: boolean;
    auditLogs: boolean;
    dedicatedAi: boolean;
  }
> = {
  FREE: {
    label: "Free",
    priceMonthly: 0,
    aiGenerationsPerMonth: -1, // unlimited
    appGenerationsPerMonth: -1, // unlimited
    publishedProjects: -1, // unlimited
    customDomains: true,
    aiImages: true,
    advancedSeo: true,
    codeExport: true,
    teamSeats: true,
    auditLogs: true,
    dedicatedAi: true,
  },
  PRO: {
    label: "Pro",
    priceMonthly: 24,
    aiGenerationsPerMonth: -1, // unlimited
    appGenerationsPerMonth: -1, // unlimited
    publishedProjects: 10,
    customDomains: true,
    aiImages: true,
    advancedSeo: true,
    codeExport: true,
    teamSeats: false,
    auditLogs: false,
    dedicatedAi: false,
  },
  ENTERPRISE: {
    label: "Enterprise",
    priceMonthly: null,
    aiGenerationsPerMonth: -1,
    appGenerationsPerMonth: -1,
    publishedProjects: -1, // unlimited
    customDomains: true,
    aiImages: true,
    advancedSeo: true,
    codeExport: true,
    teamSeats: true,
    auditLogs: true,
    dedicatedAi: true,
  },
};

export const PLAN_ORDER: Plan[] = ["FREE", "PRO", "ENTERPRISE"];

export const ROLE_RANK: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Marketing copy for the landing page (approved prototype copy). */
export const LANDING_COPY = {
  features: [
    { icon: "Sparkles", title: "AI Website Generation", desc: "Full pages composed from a single prompt — layout, copy and imagery included." },
    { icon: "Code2", title: "AI Code Generation", desc: "Clean, semantic React + Tailwind code exported with every project." },
    { icon: "MousePointer2", title: "Visual Editor", desc: "Fine-tune anything with the inspector. Every pixel stays under your control." },
    { icon: "Monitor", title: "Live Preview", desc: "Instant, real-time preview across desktop, tablet and mobile breakpoints." },
    { icon: "Smartphone", title: "Responsive Design", desc: "Every generated site adapts flawlessly to any screen size, automatically." },
    { icon: "Rocket", title: "One-Click Deployment", desc: "Ship to a global edge with SSL, CDN and a real deployment pipeline." },
    { icon: "Image", title: "AI Image Generation", desc: "On-brand hero art, icons and illustrations generated on demand." },
    { icon: "Search", title: "Real SEO Optimization", desc: "Meta tags, structured data and checks that score your site honestly." },
  ] as const,
  steps: [
    { icon: "MessageSquareText", title: "Describe your idea", desc: "Tell the AI what you want in plain language — no jargon needed." },
    { icon: "Wand2", title: "AI generates the website", desc: "Design, code, copy and images are produced from a structured plan." },
    { icon: "SlidersHorizontal", title: "Customize with AI", desc: "Refine anything by chatting or using the visual inspector." },
    { icon: "Rocket", title: "Deploy", desc: "One click and your site is live on a blazing-fast edge." },
  ] as const,
  testimonials: [
    ["Sarah Kim", "Founder @ Looply", "Went from idea to a funded startup landing page in one evening. Investors thought we hired an agency."],
    ["Marcus Chen", "Freelance Designer", "The inspector + AI chat combo is unreal. I deliver client sites 5× faster and they look better."],
    ["Priya Patel", "Marketing Lead @ Vantage", "The SEO engine found real issues — missing alt text, weak meta — and fixed them with grounded checks. Organic traffic doubled in 6 weeks."],
    ["Tom Okafor", "Indie Hacker", "I've tried every AI builder. WebForge is the first one that outputs code I'd actually ship."],
    ["Elena Ruiz", "Restaurant Owner", "I described my restaurant and had a reservation site live before dessert arrived."],
    ["David Park", "CTO @ Nimbus", "Clean React export, sane Tailwind, zero spaghetti. Our team adopted it for all prototyping."],
  ] as const,
} as const;

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};
