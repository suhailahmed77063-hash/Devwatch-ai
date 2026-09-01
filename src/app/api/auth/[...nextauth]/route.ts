import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const nextAuth = NextAuth(authConfig);

export const { GET, POST } = nextAuth.handlers;
