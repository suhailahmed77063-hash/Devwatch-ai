import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: "FREE" | "PRO" | "ENTERPRISE";
    } & DefaultSession["user"];
  }

  interface User {
    plan?: "FREE" | "PRO" | "ENTERPRISE";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: "FREE" | "PRO" | "ENTERPRISE";
  }
}
