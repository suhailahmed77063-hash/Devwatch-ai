import type Stripe from "stripe";
import type { Plan, Prisma } from "@prisma/client";
import { ConfigError, ValidationError } from "@/lib/errors";
import { getDb } from "./db";
import { optEnv, env } from "./env";
import { logger } from "./logger";
import { PLANS } from "@/lib/constants";

function stripeClient(): Stripe | null {
  const key = optEnv("STRIPE_SECRET_KEY");
  if (!key) return null;
  // Lazy import keeps the SDK out of bundles when billing is unconfigured.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StripeLib = require("stripe") as typeof Stripe;
  return new StripeLib(key, { apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion });
}

export function billingConfigured(): boolean {
  return Boolean(optEnv("STRIPE_SECRET_KEY") && optEnv("STRIPE_PRICE_PRO_MONTHLY"));
}

function priceFor(plan: Plan): string | null {
  if (plan === "PRO") return optEnv("STRIPE_PRICE_PRO_MONTHLY") ?? null;
  if (plan === "ENTERPRISE") return optEnv("STRIPE_PRICE_ENTERPRISE_MONTHLY") ?? null;
  return null;
}

export async function createCheckoutSession(input: { userId: string; plan: Plan }): Promise<string> {
  const stripe = stripeClient();
  if (!stripe) {
    throw new ConfigError("Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_*_MONTHLY.", "Payments are not configured on this deployment yet.");
  }
  const db = getDb();
  if (!db) throw new ConfigError("Database not configured");
  const user = await db.user.findUniqueOrThrow({ where: { id: input.userId } });
  const price = priceFor(input.plan);
  if (!price) throw new ValidationError(`No Stripe price configured for the ${input.plan} plan.`);
  const customerId = user.stripeCustomerId ?? undefined;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : (user.email ?? undefined),
    line_items: [{ price, quantity: 1 }],
    success_url: `${optEnv("APP_URL") ?? "http://localhost:3000"}/settings?tab=billing&checkout=success`,
    cancel_url: `${optEnv("APP_URL") ?? "http://localhost:3000"}/settings?tab=billing&checkout=cancel`,
    client_reference_id: input.userId,
    metadata: { userId: input.userId, plan: input.plan },
    allow_promotion_codes: true,
    subscription_data: { metadata: { userId: input.userId, plan: input.plan } },
  });
  return session.url ?? "/settings?tab=billing";
}

export async function createBillingPortalSession(userId: string): Promise<string> {
  const stripe = stripeClient();
  if (!stripe) throw new ConfigError("Stripe is not configured.", "Payments are not configured on this deployment yet.");
  const db = getDb();
  if (!db) throw new ConfigError("Database not configured");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.stripeCustomerId) throw new ValidationError("No billing account exists yet — start a subscription first.");
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${optEnv("APP_URL") ?? "http://localhost:3000"}/settings?tab=billing`,
  });
  return session.url;
}

/** Record the raw webhook event, then process it idempotently. */
export async function handleStripeWebhook(payload: string, signature: string | null): Promise<{ received: boolean }> {
  const db = getDb();
  if (!db) throw new ConfigError("Database not configured");

  const secret = env("STRIPE_WEBHOOK_SECRET");
  const stripe = stripeClient();
  if (!stripe) throw new ConfigError("Stripe is not configured.", "Payments are not configured on this deployment yet.");
  if (!signature) throw new ValidationError("Missing stripe-signature header");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    logger.warn("billing.webhook.verify_failed", { error: e instanceof Error ? e.message : String(e) });
    throw new ValidationError("Webhook signature verification failed.");
  }

  await db.webhookEvent.create({
    data: {
      provider: "stripe",
      eventType: event.type,
      payload: event as unknown as Prisma.InputJsonValue,
    },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = String(s.client_reference_id ?? s.metadata?.userId ?? "");
        const plan = (s.metadata?.plan as Plan) ?? "PRO";
        if (!userId) break;
        const sub = s.subscription ? String(s.subscription) : null;
        const customer = String(s.customer ?? "");
        await db.$transaction(async (tx) => {
          await tx.user.update({ where: { id: userId }, data: { plan, stripeCustomerId: customer || undefined } });
          if (sub) {
            const existing = await tx.subscription.findUnique({ where: { stripeSubscriptionId: sub } });
            const data = { userId, plan, status: "ACTIVE" as const, stripeCustomerId: customer || null, stripeSubscriptionId: sub, cancelAtPeriodEnd: false };
            if (existing) await tx.subscription.update({ where: { id: existing.id }, data });
            else await tx.subscription.create({ data });
          } else {
            const byUser = await tx.subscription.findFirst({ where: { userId } });
            if (byUser) {
              await tx.subscription.update({ where: { id: byUser.id }, data: { plan, status: "ACTIVE", stripeCustomerId: customer || undefined } });
            } else {
              await tx.subscription.create({ data: { userId, plan, status: "ACTIVE", stripeCustomerId: customer || null } });
            }
          }
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // The typed SDK omits some raw webhook fields on this API version, so we
        // read the plain JSON shape and pull out what we need defensively.
        const raw = event.data.object as unknown as {
          id: string;
          status: string;
          customer?: string | null;
          cancel_at_period_end?: boolean | null;
          current_period_end?: number | null;
          metadata?: Record<string, string> | null;
          items?: { data?: { price?: { metadata?: Record<string, string> | null } | null }[] } | null;
        };
        const userId = raw.metadata?.userId ?? (await findSubscriptionUser(raw.id));
        if (!userId) break;
        const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID"> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          incomplete: "INCOMPLETE",
          incomplete_expired: "CANCELED",
          unpaid: "UNPAID",
          trialing: "ACTIVE",
        };
        const mapped = statusMap[raw.status] ?? "CANCELED";
        const plan = (raw.items?.data?.[0]?.price?.metadata?.plan as Plan) ?? undefined;
        const cancelAtPeriodEnd = Boolean(raw.cancel_at_period_end);
        const periodEnd = typeof raw.current_period_end === "number" ? new Date(raw.current_period_end * 1000) : null;
        await db.subscription.upsert({
          where: { stripeSubscriptionId: raw.id },
          create: {
            userId,
            plan: plan ?? "PRO",
            status: mapped,
            stripeSubscriptionId: raw.id,
            stripeCustomerId: raw.customer ?? null,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd,
          },
          update: {
            status: mapped,
            plan: plan ?? undefined,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd,
          },
        });
        // Canceled / unpaid → downgrade to FREE
        if (mapped === "CANCELED" || mapped === "UNPAID") {
          await db.user.update({ where: { id: userId }, data: { plan: "FREE" } });
        } else if (plan) {
          await db.user.update({ where: { id: userId }, data: { plan } });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as { subscription?: string | null };
        const subId = invoice.subscription ? String(invoice.subscription) : null;
        if (subId) {
          const sub = await db.subscription.findUnique({ where: { stripeSubscriptionId: subId } });
          if (sub) {
            await db.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
          }
        }
        break;
      }
      default:
        break;
    }
    const latest = await db.webhookEvent.findFirst({
      where: { provider: "stripe", eventType: event.type, status: "RECEIVED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) await db.webhookEvent.updateMany({ where: { id: latest.id }, data: { status: "PROCESSED", processedAt: new Date() } });
  } catch (e) {
    logger.error("billing.webhook.process_failed", { type: event.type, error: e instanceof Error ? e.message : String(e) });
    const latest = await db.webhookEvent.findFirst({
      where: { provider: "stripe", eventType: event.type, status: "RECEIVED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) {
      await db.webhookEvent.updateMany({
        where: { id: latest.id },
        data: { status: "FAILED", processedAt: new Date(), error: e instanceof Error ? e.message.slice(0, 300) : String(e) },
      });
    }
    throw e;
  }
  return { received: true };
}

async function findSubscriptionUser(subscriptionId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const sub = await db.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId }, select: { userId: true } });
  return sub?.userId ?? null;
}

export function planLabel(plan: Plan): string {
  return PLANS[plan].label;
}
