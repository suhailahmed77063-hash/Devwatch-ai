import { isConfigured } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/**
 * Health check for uptime monitors (Vercel Cron, UptimeRobot, etc.).
 * Returns 200 with status + version info. The database is probed lazily and
 * reported honestly — a missing DB shows "degraded" (503), never fake "ok".
 */
export async function GET() {
  const base = {
    app: "webforge-ai",
    status: "ok",
    time: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    checks: {
      database: isConfigured("DATABASE_URL") ? "configured" : "not-configured",
      ai: isConfigured("OPENAI_API_KEY") ? "configured" : "not-configured",
      storage: isConfigured("S3_ACCESS_KEY_ID") ? "s3" : "local",
    },
  } as const;

  let dbReachable: boolean | null = null;
  if (isConfigured("DATABASE_URL")) {
    try {
      const { requireDb } = await import("@/lib/server/db");
      await requireDb().$queryRaw`SELECT 1`;
      dbReachable = true;
    } catch {
      dbReachable = false;
    }
  }

  const ok = dbReachable !== false;
  return Response.json(
    {
      ...base,
      status: ok ? "ok" : "degraded",
      checks: { ...base.checks, database: dbReachable === true ? "reachable" : dbReachable === false ? "unreachable" : "not-configured" },
    },
    { status: ok ? 200 : 503 }
  );
}

export async function POST() {
  return new Response(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for the health check." } }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "GET" },
  });
}