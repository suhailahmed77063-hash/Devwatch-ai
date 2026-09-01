import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export default {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          redirect_uri: `${authUrl}/api/auth/callback/github`,
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (!user[0] || !user[0].passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user[0].passwordHash
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
            image: user[0].image,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = (token as any).accessToken;
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        try {
          // Check if user exists, create if not
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.githubId, account.providerAccountId))
            .limit(1);

          if (!existingUser[0]) {
            // Create new user from GitHub
            await db.insert(users).values({
              email: user.email || "",
              name: user.name || "GitHub User",
              image: user.image,
              githubId: account.providerAccountId,
              role: "viewer",
            });
          }
        } catch (error) {
          console.error("GitHub sign-in error:", error);
          // Don't block sign-in if DB fails
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
