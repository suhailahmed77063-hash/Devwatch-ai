import { requireUserOrThrow } from "@/lib/server/session";
import { requireDb } from "@/lib/server/db";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUserOrThrow();
    const db = requireDb();
    const me = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, name: true, email: true, plan: true, emailVerified: true },
    });
    return jsonOk({ user: me });
  } catch (e) {
    return jsonError(e);
  }
}
