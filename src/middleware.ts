import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only protect dashboard routes
  const isProtected = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/repositories") ||
    pathname.startsWith("/pull-requests") ||
    pathname.startsWith("/commits") ||
    pathname.startsWith("/security") ||
    pathname.startsWith("/vulnerabilities") ||
    pathname.startsWith("/developers") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/ai-manager") ||
    pathname.startsWith("/releases") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/settings");

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for NextAuth v5 session cookie (authjs) OR v4 cookie (next-auth)
  const hasToken =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("__Host-authjs.session-token") ||
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  if (!hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
