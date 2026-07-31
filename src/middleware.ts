import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession, homeForRole } from "@/lib/auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const needsAdmin = pathname.startsWith("/admin");
  const needsCreator = pathname.startsWith("/creator");

  // Not signed in → send to login, remembering where they were headed.
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in but wrong role → bounce to their own home.
  if (needsAdmin && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (needsCreator && session.role !== "CREATOR" && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/creator/:path*", "/admin/:path*"],
};
