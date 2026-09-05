import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { jsonOk, jsonError } from "@/lib/server/http";
import {
  addMemory,
  getMemoriesByType,
  searchMemories,
  removeMemory,
  clearMemories,
  buildProjectContext,
  formatContextForPrompt,
  type MemoryType,
} from "@/lib/server/ai/memory";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  type: z.enum(["architecture", "preferences", "decisions", "issues", "successful"]),
  key: z.string().min(1).max(200),
  value: z.string().min(1).max(2000),
});

/**
 * GET /api/projects/:id/memory
 * Get memories or build context
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "context") {
      const ctx = await buildProjectContext(id);
      return jsonOk({ context: ctx, formatted: formatContextForPrompt(ctx) });
    }

    const type = url.searchParams.get("type") as MemoryType | null;
    const query = url.searchParams.get("q");

    if (query) {
      const memories = searchMemories(id, query);
      return jsonOk({ memories });
    }

    if (type) {
      const memories = getMemoriesByType(id, type);
      return jsonOk({ memories });
    }

    // Return all memories grouped by type
    const allTypes: MemoryType[] = ["architecture", "preferences", "decisions", "issues", "successful"];
    const grouped = Object.fromEntries(
      allTypes.map((t) => [t, getMemoriesByType(id, t)])
    );
    return jsonOk({ memories: grouped });
  } catch (e) {
    return jsonError(e);
  }
}

/**
 * POST /api/projects/:id/memory
 * Add a memory entry
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "EDITOR");

    const body = addSchema.parse(await req.json());
    addMemory(id, body.type, body.key, body.value);

    return jsonOk({ added: true });
  } catch (e) {
    return jsonError(e);
  }
}

/**
 * DELETE /api/projects/:id/memory
 * Clear memories
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "OWNER");

    const url = new URL(req.url);
    const memoryId = url.searchParams.get("memoryId");

    if (memoryId) {
      removeMemory(id, memoryId);
    } else {
      clearMemories(id);
    }

    return jsonOk({ deleted: true });
  } catch (e) {
    return jsonError(e);
  }
}
