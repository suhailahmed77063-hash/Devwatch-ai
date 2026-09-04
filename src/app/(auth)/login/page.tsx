import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  const { next } = await searchParams;
  if (user) redirect(next || "/projects");
  return (
    <LoginForm
      next={next}
      google={Boolean(process.env.GOOGLE_CLIENT_ID)}
      github={Boolean(process.env.GITHUB_CLIENT_ID)}
    />
  );
}
