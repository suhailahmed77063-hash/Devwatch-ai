import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Plan } from "@prisma/client";
import { UnauthorizedError } from "@/lib/errors";

export interface SessionUser {
  id: string;
  email: string | null | undefined;
  name: string | null | undefined;
  image: string | null | undefined;
  plan: Plan;
}

/** Get the signed-in user or null. Safe for RSC/route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    plan: (session.user as { plan?: Plan }).plan ?? "FREE",
  };
}

/** Guard for server components: redirects to login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Guard for server actions & route handlers: throws a proper 401. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
