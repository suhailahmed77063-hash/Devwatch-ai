import type { Operation, Section, SectionType, WebsiteSchema } from "@/types/website";
import { createSection, SECTION_DEFS } from "./sections";
import { mergeSectionProps, validateWebsite } from "./schema";

export class OperationError extends Error {}

/** Clone a document (plain JSON — schema documents are JSON-safe). */
export function cloneDoc(doc: WebsiteSchema): WebsiteSchema {
  return JSON.parse(JSON.stringify(doc)) as WebsiteSchema;
}

function mergeProps(base: Record<string, unknown>, patch: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v; // arrays replace wholesale
      continue;
    }
    if (typeof v === "object" && v !== null && typeof out[k] === "object" && out[k] !== null && !Array.isArray(out[k])) {
      out[k] = { ...(out[k] as object), ...(v as object) };
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Apply a single op to a document, returning a fresh document. Throws OperationError. */
export function applyOperation(doc: WebsiteSchema, op: Operation): WebsiteSchema {
  const next = cloneDoc(doc);

  switch (op.op) {
    case "UPDATE_THEME": {
      next.theme = { ...next.theme, ...op.patch } as WebsiteSchema["theme"];
      return next;
    }
    case "UPDATE_GLOBAL": {
      const g = next.globalComponents[op.component];
      next.globalComponents = {
        ...next.globalComponents,
        [op.component]: { ...g, ...op.patch } as typeof g,
      };
      return next;
    }
    case "ADD_PAGE": {
      if (next.pages.length >= 25) throw new OperationError("Page limit reached (25)");
      const slug = op.slug.startsWith("/") ? op.slug : `/${op.slug}`;
      if (next.pages.some((p) => p.slug === slug)) throw new OperationError(`Page "${slug}" already exists`);
      const page: WebsiteSchema["pages"][number] = {
        id: `page-${Math.random().toString(36).slice(2, 9)}`,
        slug,
        name: op.name,
        seo: { title: op.name, description: "" },
        sections: [],
      };
      const at = op.insertAt === undefined ? next.pages.length : Math.min(op.insertAt, next.pages.length);
      next.pages.splice(at, 0, page);
      return next;
    }
    case "REMOVE_PAGE": {
      if (next.pages.length <= 1) throw new OperationError("A website must keep at least one page");
      if (op.pageIndex < 0 || op.pageIndex >= next.pages.length) throw new OperationError("Invalid page index");
      next.pages.splice(op.pageIndex, 1);
      return next;
    }
    case "UPDATE_PAGE": {
      const page = next.pages[op.pageIndex];
      if (!page) throw new OperationError("Invalid page index");
      if (op.patch.slug) {
        const slug = op.patch.slug.startsWith("/") ? op.patch.slug : `/${op.patch.slug}`;
        if (slug !== page.slug && next.pages.some((p) => p.slug === slug)) throw new OperationError(`Page "${slug}" already exists`);
        page.slug = slug;
      }
      if (op.patch.name) page.name = op.patch.name;
      if (op.patch.seo) page.seo = { ...page.seo, ...op.patch.seo };
      return next;
    }
    case "ADD_SECTION": {
      const page = next.pages[op.pageIndex];
      if (!page) throw new OperationError("Invalid page index");
      if (page.sections.length >= 40) throw new OperationError("Section limit reached for this page");
      let section: Section;
      if (op.props || op.styles) {
        const defaults = SECTION_DEFS[op.type].defaults();
        section = createSection(op.type, {
          props: op.props ? mergeSectionProps(op.type, op.props) : defaults.props,
          styles: op.styles ? { ...defaults.styles, ...op.styles } : defaults.styles,
        });
      } else {
        section = createSection(op.type);
      }
      const at = op.insertAt === undefined ? page.sections.length : Math.min(op.insertAt, page.sections.length);
      page.sections.splice(at, 0, section);
      return next;
    }
    case "REMOVE_SECTION": {
      const page = next.pages[op.pageIndex];
      const sec = page?.sections?.[op.sectionIndex];
      if (!sec) throw new OperationError("Invalid section index");
      page.sections.splice(op.sectionIndex, 1);
      return next;
    }
    case "MOVE_SECTION": {
      const page = next.pages[op.pageIndex];
      if (!page) throw new OperationError("Invalid page index");
      const { from, to } = op;
      if (from === to) return next;
      if (from < 0 || from >= page.sections.length || to < 0 || to >= page.sections.length) {
        throw new OperationError("Invalid move indexes");
      }
      const [moved] = page.sections.splice(from, 1);
      page.sections.splice(to, 0, moved);
      return next;
    }
    case "UPDATE_SECTION": {
      const page = next.pages[op.pageIndex];
      const sec = page?.sections?.[op.sectionIndex];
      if (!sec) throw new OperationError("Invalid section index");
      if (op.props) sec.props = mergeSectionProps(sec.type, { ...sec.props, ...op.props });
      if (op.patch) sec.props = mergeSectionProps(sec.type, { ...sec.props, ...op.patch });
      if (op.styles) sec.styles = { ...sec.styles, ...op.styles };
      if (op.animation) sec.animation = { ...sec.animation, ...op.animation };
      if (op.responsive) {
        sec.responsive = { ...(sec.responsive ?? {}) };
        for (const [bp, st] of Object.entries(op.responsive)) {
          sec.responsive[bp as "mobile" | "tablet" | "desktop"] = {
            ...(sec.responsive[bp as "mobile" | "tablet" | "desktop"] ?? {}),
            ...(st as object),
          } as never;
        }
      }
      return next;
    }
    case "ADD_ASSET": {
      next.metadata.assets = [
        ...next.metadata.assets.filter((a) => a.url !== op.asset.url),
        op.asset as WebsiteSchema["metadata"]["assets"][number],
      ];
      return next;
    }
    case "REMOVE_ASSET": {
      next.metadata.assets = next.metadata.assets.filter((a) => a.url !== op.url);
      return next;
    }
    default: {
      const exhaustive: never = op;
      throw new OperationError(`Unknown operation ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Apply a patch (list of ops) transactionally. Returns a validated doc or throws. */
export function applyPatch(doc: WebsiteSchema, ops: Operation[]): WebsiteSchema {
  let current = doc;
  for (const op of ops) {
    current = applyOperation(current, op);
  }
  const check = validateWebsite(current);
  if (!check.ok) throw new OperationError(`Patch produced an invalid website: ${check.error}`);
  return check.data;
}

/** Human description of an operation batch (used for version messages). */
export function describeOps(ops: Operation[], doc?: WebsiteSchema): string {
  const seen = new Set<string>();
  const parts = ops.map((op) => {
    switch (op.op) {
      case "UPDATE_THEME": {
        const k = Object.keys(op.patch);
        return k.length === 1 ? `Changed ${k[0]}` : "Updated theme";
      }
      case "UPDATE_GLOBAL":
        return `Updated ${op.component}`;
      case "ADD_PAGE":
        return `Added page “${op.name}”`;
      case "REMOVE_PAGE":
        return "Removed a page";
      case "UPDATE_PAGE":
        return `Edited page ${op.patch.name ?? op.pageIndex + 1}`;
      case "ADD_SECTION":
        return `Added ${sectionLabel(op.type)} section`;
      case "REMOVE_SECTION":
        return "Removed a section";
      case "MOVE_SECTION":
        return "Moved a section";
      case "UPDATE_SECTION": {
        const label = doc ? sectionLabelFor(doc, op.pageIndex, op.sectionIndex) : null;
        const key = `${op.pageIndex}:${op.sectionIndex}`;
        if (seen.has(key)) return "";
        seen.add(key);
        const bits: string[] = [];
        if (op.styles && Object.keys(op.styles).length) bits.push("styles");
        if (op.props && Object.keys(op.props).length) bits.push("content");
        if (op.animation) bits.push("animation");
        return `Updated ${label}${bits.length ? ` (${bits.join(", ")})` : ""}`;
      }
      case "ADD_ASSET":
        return "Added an asset";
      case "REMOVE_ASSET":
        return "Removed an asset";
      default:
        return "Edited site";
    }
  });
  return parts.filter(Boolean).join(" · ");
}

function sectionLabel(t: SectionType): string {
  return SECTION_DEFS[t].label.toLowerCase();
}

function sectionLabelFor(doc: WebsiteSchema, pageIndex: number, sectionIndex: number): string {
  const sec = doc.pages[pageIndex]?.sections?.[sectionIndex];
  if (!sec) return "section";
  return `“${SECTION_DEFS[sec.type].label}” section`;
}
