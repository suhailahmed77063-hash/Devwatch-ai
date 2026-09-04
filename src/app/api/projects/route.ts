import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { listProjectsForUser, createProject } from "@/lib/server/data/projects";
import { saveSchemaVersion } from "@/lib/server/data/versions";
import { buildTemplateSite, TEMPLATE_METAS } from "@/lib/templates/catalog";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUserOrThrow();
    const items = await listProjectsForUser(user.id);
    return jsonOk({ projects: items });
  } catch (e) {
    return jsonError(e);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(80).default("Untitled Project"),
  template: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUserOrThrow();
    const body = createSchema.parse(await req.json());
    const template = body.template ?? null;
    let doc = null;
    let name = body.name;
    if (template) {
      const meta = TEMPLATE_METAS.find((t) => t.slug === template || t.category.toLowerCase() === template.toLowerCase());
      if (!meta) return jsonError(new Error("Unknown template"));
      doc = buildTemplateSite(meta.category);
      name = name === "Untitled Project" ? `${meta.name} — ${(doc.metadata as { name: string }).name}` : name;
    }
    const projectId = await createProject({ name, ownerId: user.id, status: doc ? "READY" : "DRAFT" });
    if (doc) await saveSchemaVersion({ projectId, schema: doc, message: "Initialized from template", createdById: user.id, createVersion: true });
    return jsonOk({ id: projectId }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
