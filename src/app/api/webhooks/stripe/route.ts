import { handleStripeWebhook } from "@/lib/server/billing";
import { jsonOk, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");
    await handleStripeWebhook(payload, signature);
    return jsonOk({ received: true });
  } catch (e) {
    return jsonError(e);
  }
}
