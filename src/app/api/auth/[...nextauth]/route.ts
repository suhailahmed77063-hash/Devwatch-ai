import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const handlers = NextAuth(authConfig);

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  return handlers.POST(request);
}
