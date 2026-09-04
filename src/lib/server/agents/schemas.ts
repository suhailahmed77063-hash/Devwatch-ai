import { z } from "zod";

export const planSchema = z.object({
  siteType: z.string().max(60),
  name: z.string().min(1).max(60),
  tagline: z.string().max(200),
  description: z.string().max(400),
  audience: z.string().max(200),
  headingFont: z.enum(["Space Grotesk", "Inter", "Poppins", "Sora"]),
  bodyFont: z.enum(["Inter", "Space Grotesk", "Poppins", "Sora"]),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  background: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  surface: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  textColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  radius: z.number().min(0).max(24),
  sitemap: z
    .array(
      z.object({
        slug: z.string().regex(/^\/[a-z0-9-]*$/),
        name: z.string().min(1).max(60),
        purpose: z.string().max(200),
      })
    )
    .min(1)
    .max(6),
});

export type Plan = z.infer<typeof planSchema>;

export const contentPageSchema = z.object({
  slug: z.string().regex(/^\/[a-z0-9-]*$/),
  name: z.string().min(1).max(60),
  // raw sections with type + props; normalized later
  sections: z
    .array(
      z.object({
        type: z.enum([
          "hero", "features", "logos", "stats", "testimonials", "pricing", "faq",
          "gallery", "cta", "contact", "steps", "divider",
        ]),
        props: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(30),
});

export const contentResultSchema = z.object({
  pages: z.array(contentPageSchema).min(1).max(6),
});

export const seoResultSchema = z.object({
  pages: z
    .array(
      z.object({
        slug: z.string().regex(/^\/[a-z0-9-]*$/),
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(200),
        ogImagePrompt: z.string().max(300).optional(),
        jsonLd: z.array(z.record(z.string(), z.unknown())).optional(),
      })
    )
    .min(1)
    .max(6),
});

export const editorResultSchema = z.object({
  summary: z.string().min(1).max(500),
  reply: z.string().min(1).max(1200),
  ops: z.array(z.unknown()).max(10),
});

export const planPromptResultSchema = planSchema;
