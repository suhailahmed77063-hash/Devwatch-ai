import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConfigured, getDb } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";
import { optEnv } from "@/lib/server/env";
import type { Plan } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
});

const secret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "webforge-dev-secret-do-not-use-in-prod" : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  adapter: dbConfigured() ? (PrismaAdapter(getDb()!) as never) : undefined,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const db = getDb();
        if (!db) return null;
        const email = parsed.data.email.toLowerCase();
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          plan: user.plan as Plan,
        };
      },
    }),
    ...(optEnv("GOOGLE_CLIENT_ID") && optEnv("GOOGLE_CLIENT_SECRET")
      ? [Google({ clientId: optEnv("GOOGLE_CLIENT_ID")!, clientSecret: optEnv("GOOGLE_CLIENT_SECRET")! })]
      : []),
    ...(optEnv("GITHUB_CLIENT_ID") && optEnv("GITHUB_CLIENT_SECRET")
      ? [GitHub({ clientId: optEnv("GITHUB_CLIENT_ID")!, clientSecret: optEnv("GITHUB_CLIENT_SECRET")! })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        token.plan = (user as { plan?: Plan }).plan ?? "FREE";
      }
      if (trigger === "update" && session?.user) {
        const s = session as { user?: { plan?: Plan } };
        if (s.user?.plan) token.plan = s.user.plan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        const plan = token.plan as Plan | undefined;
        // Keep plan in sync with billing state (authoritative check is DB-side anyway).
        try {
          const db = getDb();
          if (db && session.user.id) {
            const u = await db.user.findUnique({ where: { id: session.user.id }, select: { plan: true, emailVerified: true } });
            if (u) {
              session.user.plan = u.plan;
              return session;
            }
          }
        } catch (e) {
          logger.warn("auth.session.db_sync_failed", { error: e instanceof Error ? e.message : String(e) });
        }
        session.user.plan = plan ?? "FREE";
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user }) {
      logger.info("auth.oauth_linked", { userId: user.id });
    },
  },
});
