import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthPage = request.nextUrl.pathname === "/login"
    || request.nextUrl.pathname === "/signup"
    || request.nextUrl.pathname.startsWith("/api/auth");

  const isPublicPage = request.nextUrl.pathname === "/"
    || request.nextUrl.pathname === "/login"
    || request.nextUrl.pathname === "/signup";

  // If not authenticated and trying to access protected page
  if (!token && !isPublicPage && !isAuthPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and on login page, redirect to dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/repositories/:path*",
    "/pull-requests/:path*",
    "/commits/:path*",
    "/security/:path*",
    "/vulnerabilities/:path*",
    "/developers/:path*",
    "/projects/:path*",
    "/alerts/:path*",
    "/reports/:path*",
    "/ai-manager/:path*",
    "/releases/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
