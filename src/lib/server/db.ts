import { PrismaClient } from "@prisma/client";
import { ConfigError } from "@/lib/errors";

const globalForPrisma = globalThis as unknown as { webforgePrisma?: PrismaClient };

/** True when a database is configured for this process. */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Get the shared Prisma client, or null when DATABASE_URL is not configured. */
export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForPrisma.webforgePrisma) {
    globalForPrisma.webforgePrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      // Interactive transactions can span many sequential inserts when a
      // template / generated site is materialized (pages + sections + nav).
      // Serverless + Neon latency makes the 5s default too tight — allow 60s.
      transactionOptions: { maxWait: 10_000, timeout: 60_000 },
    });
  }
  return globalForPrisma.webforgePrisma;
}

/** Require a DB connection or fail with an actionable config error. */
export function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) {
    throw new ConfigError(
      "DATABASE_URL is not configured. Start Postgres (docker compose up -d) and copy .env.example to .env.local.",
      "The application database is not configured. Start the local Postgres with `docker compose up -d` and create `.env.local` from `.env.example`."
    );
  }
  return db;
}
