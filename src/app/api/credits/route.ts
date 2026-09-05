import { requireUserOrThrow } from "@/lib/server/session";
import { getDashboardUsage } from "@/lib/server/usage";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUserOrThrow();
    const usage = await getDashboardUsage(user.id);
    return jsonOk({
      plan: user.plan,
      usage,
    });
  } catch (e) {
    return jsonError(e);
  }
}
