import type { Metadata } from "next";
import { requireUser } from "@/lib/server/session";
import { requireDb } from "@/lib/server/db";
import { getDashboardUsage } from "@/lib/server/usage";
import { billingConfigured } from "@/lib/server/billing";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = requireDb();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const usage = await getDashboardUsage(user.id);

  return (
    <SettingsClient
      userName={me.name}
      userEmail={me.email}
      plan={me.plan}
      verified={Boolean(me.emailVerified)}
      usage={usage}
      billingConfigured={billingConfigured()}
    />
  );
}
