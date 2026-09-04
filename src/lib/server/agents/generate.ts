import type { Project, User } from "@prisma/client";
import type { WebsiteSchema } from "@/types/website";
import { ValidationError, AiProviderError, ConfigError, NotFoundError } from "@/lib/errors";
import { logger } from "../logger";
import { requireDb } from "../db";
import { getLLM, getImageProvider } from "../ai/config";
import { structured } from "../ai/structured";
import { planSchema, contentResultSchema, seoResultSchema } from "./schemas";
import { buildPlanPrompt, buildContentPrompt, buildSeoPrompt, compactSiteForSummary, websiteSystem, clampPrompt } from "./prompts";
import { defaultGlobalComponents, mergeSectionProps, normalizeWebsite } from "@/lib/website/schema";
import { createSection } from "@/lib/website/sections";
import { saveSchemaVersion } from "../data/versions";
import { assertPlanAllowed, recordUsage } from "../usage";
import { logAudit } from "../audit";
import { runSeoChecks } from "@/lib/seo/checks";

export type GenStageId =
  | "analyzing"
  | "planning"
  | "designing"
  | "writing"
  | "optimizing"
  | "validating"
  | "images"
  | "saving"
  | "done";

export type GenEvent =
  | { type: "stage"; id: GenStageId; label: string }
  | { type: "log"; message: string }
  | { type: "seo"; score: number }
  | { type: "site"; doc: WebsiteSchema; summary: string }
  | { type: "error"; message: string; code: string };

export interface GenerateInput {
  project: Project;
  actor: Pick<User, "id" | "plan">;
  prompt: string;
  emit: (e: GenEvent) => void;
  fillImages?: boolean;
}

interface Assembled {
  name: string;
  tagline: string;
  siteType: string;
  pages: { slug: string; name: string; sections: unknown[] }[];
}

export async function runGenerateWebsite(input: GenerateInput): Promise<WebsiteSchema> {
  const db = requireDb();
  const startedAt = Date.now();
  const project = await db.project.findUnique({ where: { id: input.project.id } });
  if (!project) throw new NotFoundError("Project");

  // 1. validate + meter the prompt
  input.emit({ type: "stage", id: "analyzing", label: "Analyzing request…" });
  const prompt = clampPrompt(input.prompt.trim());
  if (prompt.length < 8) {
    throw new ValidationError("Describe what you want to build in at least a few words, e.g. “a landing page for a coffee subscription”.");
  }
  if (prompt.length > 8000) throw new ValidationError("Prompt is too long (max 8000 characters).");
  await assertPlanAllowed("AI_GENERATION", { user: input.actor, projectId: project.id });
  await recordUsage({ userId: input.actor.id, kind: "AI_GENERATION" });

  const generation = await db.generation.create({
    data: { projectId: project.id, userId: input.actor.id, kind: "WEBSITE", status: "RUNNING", prompt },
  });

  let tokensIn = 0;
  let tokensOut = 0;
  let modelUsed = "";
  let repairedAny = false;
  let siteType = "website";

  const fail = async (message: string, e?: unknown) => {
    const publicMsg = e instanceof ConfigError || e instanceof AiProviderError || e instanceof ValidationError ? e.publicMessage : message;
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", error: publicMsg.slice(0, 400), finishedAt: new Date(), durationMs: Date.now() - startedAt },
    });
    input.emit({ type: "error", message: publicMsg, code: "GENERATION_FAILED" });
  };

  try {
    await db.project.update({ where: { id: project.id }, data: { status: "GENERATING" } });

    // 2. Planner — sitemap, brand, theme
    input.emit({ type: "stage", id: "planning", label: "Planning your website…" });
    const plan = await structured(() => getLLM(project), {
      label: "website plan",
      schema: planSchema,
      request: { system: websiteSystem(), user: buildPlanPrompt(prompt) },
    });
    tokensIn += plan.tokensIn;
    tokensOut += plan.tokensOut;
    modelUsed = plan.model;
    repairedAny = repairedAny || plan.repaired;
    siteType = plan.data.siteType;
    logger.info("ai.generate.plan", { projectId: project.id, siteType });

    // 3. Content — sections + copy per page
    input.emit({ type: "stage", id: "writing", label: "Writing sections & copy…" });
    const content = await structured(() => getLLM(project), {
      label: "page content",
      schema: contentResultSchema,
      request: {
        system: websiteSystem(),
        user: buildContentPrompt(
          JSON.stringify({ ...plan.data, sitemap: plan.data.sitemap }),
          `Font pairing for this site: headings ${plan.data.headingFont}, body ${plan.data.bodyFont}. Theme primary ${plan.data.primaryColor}.`
        ),
        maxTokens: 9000,
      },
    });
    tokensIn += content.tokensIn;
    tokensOut += content.tokensOut;
    modelUsed = content.model;
    repairedAny = repairedAny || content.repaired;

    const pagesBySlug = new Map(plan.data.sitemap.map((s) => [s.slug, s.name]));
    const assembled: Assembled = {
      name: plan.data.name,
      tagline: plan.data.tagline,
      siteType: plan.data.siteType,
      pages: content.data.pages.map((p) => {
        const planPage = plan.data.sitemap.find((s) => s.slug === p.slug);
        const name = p.name || planPage?.name || pagesBySlug.get(p.slug) || p.slug;
        return {
          slug: p.slug,
          name,
          sections: p.sections.map((s) => {
            const defs = createSection(s.type as never);
            return {
              ...defs,
              type: s.type as never,
              props: mergeSectionProps(s.type as never, (s.props ?? {}) as Record<string, unknown>),
              id: `sec-${Math.random().toString(36).slice(2, 9)}`,
              animation: { effect: "fadeUp", durationSec: 0.7, delayMs: 0 } as const,
            };
          }),
        };
      }),
    };

    // Guarantee pages planned but skipped by the model get a sensible page.
    for (const s of plan.data.sitemap) {
      if (!assembled.pages.some((p) => p.slug === s.slug)) {
        assembled.pages.push({
          slug: s.slug,
          name: s.name,
          sections: [
            {
              ...createSection("hero"),
              id: `sec-${Math.random().toString(36).slice(2, 9)}`,
              type: "hero",
              props: {
                badge: plan.data.name,
                lines: [{ text: s.name, accent: false }, { text: "", accent: false }],
                sub: `About ${s.name} — ${s.purpose}`,
                primaryCta: { label: "Get in touch", href: "/contact" },
                size: "md" as const,
              },
            },
            { ...createSection("cta"), id: `sec-${Math.random().toString(36).slice(2, 9)}`, type: "cta" },
          ],
        });
      }
    }

    // 4. Assemble + normalize (repair tolerant)
    input.emit({ type: "stage", id: "designing", label: "Composing layout & theme…" });
    const theme = {
      primaryColor: plan.data.primaryColor,
      background: plan.data.background,
      surface: plan.data.surface,
      textColor: plan.data.textColor,
      headingFont: plan.data.headingFont,
      bodyFont: plan.data.bodyFont,
      radius: plan.data.radius,
    };
    const globals = defaultGlobalComponents(plan.data.name);
    const doc = normalizeWebsite({
      schemaVersion: 1,
      metadata: { name: plan.data.name, description: plan.data.description, assets: [] },
      theme,
      globalComponents: globals,
      pages: assembled.pages.map((p) => ({ id: `page-${Math.random().toString(36).slice(2, 8)}`, slug: p.slug, name: p.name, seo: { title: `${p.name} — ${plan.data.name}`, description: "" }, sections: p.sections })),
    });

    // 5. SEO — titles, descriptions, structured data
    input.emit({ type: "stage", id: "optimizing", label: "Optimizing SEO…" });
    const seoRes = await structured(() => getLLM(project), {
      label: "seo metadata",
      schema: seoResultSchema,
      request: { system: websiteSystem(), user: buildSeoPrompt(compactSiteForSummary(doc)) },
    });
    tokensIn += seoRes.tokensIn;
    tokensOut += seoRes.tokensOut;
    modelUsed = seoRes.model;
    repairedAny = repairedAny || seoRes.repaired;

    for (const page of doc.pages) {
      const meta = seoRes.data.pages.find((p) => p.slug === page.slug);
      if (meta) {
        page.seo.title = meta.title.slice(0, 80);
        page.seo.description = meta.description.slice(0, 200);
        if (meta.jsonLd) page.seo.jsonLd = meta.jsonLd;
      }
    }
    const final = normalizeWebsite(doc);

    // 6. validation + review pass
    input.emit({ type: "stage", id: "validating", label: "Validating design…" });
    const report = runSeoChecks(final);
    input.emit({ type: "seo", score: report.score });
    const problems = report.checks.filter((c) => !c.ok && c.weight >= 8);
    if (problems.length) input.emit({ type: "log", message: `Review found ${problems.length} issue${problems.length === 1 ? "" : "s"} (top: ${problems[0].label}).` });

    // 7. optional AI imagery for empty gallery slots (real image provider)
    if (input.fillImages) {
      try {
        await assertPlanAllowed("IMAGE_GENERATION", { user: input.actor, projectId: project.id });
        input.emit({ type: "stage", id: "images", label: "Generating images…" });
        await fillGalleryImages({ doc: final, project, actor: input.actor, emit: input.emit });
      } catch (e) {
        logger.warn("ai.generate.image_fill_skipped", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // 8. persist a version
    input.emit({ type: "stage", id: "saving", label: "Saving your project…" });
    const summary = `Generated “${final.metadata.name}” — ${final.pages.length} page${final.pages.length === 1 ? "" : "s"}, ${final.pages.reduce((a, p) => a + p.sections.length, 0)} sections${repairedAny ? " (auto-repaired)" : ""}.`;
    await saveSchemaVersion({
      projectId: project.id,
      schema: final,
      message: `AI generation: “${prompt.slice(0, 140)}”`,
      createdById: input.actor.id,
      createVersion: true,
    });

    const durationMs = Date.now() - startedAt;
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        durationMs,
        tokensIn,
        tokensOut,
        model: modelUsed,
        result: { pages: final.pages.length, sections: final.pages.reduce((a, p) => a + p.sections.length, 0), name: final.metadata.name, siteType, summary, seoScore: report.score },
      },
    });
    await logAudit({ actorId: input.actor.id, projectId: project.id, action: "ai.generate", entity: "Generation", entityId: generation.id, meta: { kind: "WEBSITE", tokensIn, tokensOut } });

    input.emit({ type: "log", message: `Done in ${(durationMs / 1000).toFixed(1)}s · ${tokensIn + tokensOut} tokens · SEO score ${report.score}/100` });
    input.emit({ type: "site", doc: final, summary });
    return final;
  } catch (e) {
    logger.error("ai.generate.failed", { projectId: project.id, error: e instanceof Error ? e.message : String(e) });
    if (e instanceof ValidationError || e instanceof ConfigError || e instanceof AiProviderError) {
      await fail(e.publicMessage, e);
      throw e;
    }
    const msg = e instanceof Error && e.message.includes("validation") ? "The AI output didn't pass validation. Try a more specific prompt." : "Generation failed. Please try again.";
    await fail(msg, e);
    throw new AiProviderError("generation failed", msg);
  }
}

/** Generate images for gallery items that have none — max 4 per run. */
async function fillGalleryImages(opts: { doc: WebsiteSchema; project: Project; actor: Pick<User, "id" | "plan">; emit: (e: GenEvent) => void }) {
  const provider = getImageProvider(opts.project);
  if (!provider) return;
  const db = requireDb();
  const { doc, actor } = opts;
  const slots: { pageIndex: number; sectionIndex: number; itemIndex: number; prompt: string }[] = [];
  doc.pages.forEach((page, pageIndex) => {
    page.sections.forEach((section, sectionIndex) => {
      if (section.type !== "gallery") return;
      const items = (section.props as { items?: { image?: string; title?: string; desc?: string }[] }).items ?? [];
      items.forEach((item, itemIndex) => {
        if (!item.image && item.title) {
          slots.push({ pageIndex, sectionIndex, itemIndex, prompt: `Professional website photograph for "${item.title}"${item.desc ? ` — ${item.desc}` : ""}, cohesive with a ${doc.theme.primaryColor} accent on a dark editorial style` });
        }
      });
    });
  });
  const targets = slots.slice(0, 4);
  if (!targets.length) return;
  for (const slot of targets) {
    try {
      const imgs = await provider.generate({ prompt: slot.prompt, n: 1, size: "1024x1024" });
      const image = imgs[0];
      if (!image) continue;
      const section = doc.pages[slot.pageIndex].sections[slot.sectionIndex];
      const items = (section.props as { items?: { image?: string }[] }).items;
      if (!items) continue;
      items[slot.itemIndex].image = image.url;
      doc.metadata.assets = [...doc.metadata.assets.filter((a) => a.url !== image.url), { url: image.url, name: section.props?.["title"] as string ?? "AI image", generated: true }];
      await recordUsage({ userId: actor.id, kind: "IMAGE_GENERATION", meta: { url: image.url } });
    } catch (e) {
      logger.warn("ai.generate.image_fill_failed", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  void db;
}
