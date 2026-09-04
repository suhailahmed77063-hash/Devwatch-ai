import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { SignupForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  const { next } = await searchParams;
  if (user) redirect(next || "/projects");
  return (
    <SignupForm
      next={next}
      google={Boolean(process.env.GOOGLE_CLIENT_ID)}
      github={Boolean(process.env.GITHUB_CLIENT_ID)}
    />
  );
}
