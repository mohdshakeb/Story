import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Phase 1: No auth required — single user prototype.
  // Phase 2: Add Supabase auth session checks here for /dashboard/* routes.

  // Redirect root to dashboard
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match root path and dashboard routes
    "/",
    "/dashboard/:path*",
  ],
};
