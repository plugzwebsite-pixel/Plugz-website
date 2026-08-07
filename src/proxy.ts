import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession, homeForRole } from "@/lib/auth/jwt";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Cross-site request forgery check.
 *
 * The session cookie is SameSite=lax, which already stops a browser sending it
 * on a cross-site POST. This is the second layer: a forged request comes *from*
 * a browser, and browsers always attach Origin to a cross-origin state-changing
 * request — so a mismatched Origin is proof of forgery.
 *
 * A missing Origin and Referer is left alone rather than blocked: that's a
 * non-browser client (curl, a server-to-server call), which can't be tricked
 * into a CSRF in the first place, and rejecting it would break legitimate
 * integrations for no security gain.
 */
function isForgedRequest(req: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(req.method)) return false;

  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true; // unparseable Origin is not something a browser sends
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host !== host;
    } catch {
      return true;
    }
  }

  return false;
}

// Next 16 renamed the middleware convention to `proxy`; the export name has to
// match the filename or the build refuses it.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isForgedRequest(req)) {
    return NextResponse.json(
      { ok: false, message: "Request blocked." },
      { status: 403 }
    );
  }

  // API routes answer for themselves — each one guards its own access and
  // returns JSON. Redirecting them to the login page would hand callers an
  // HTML document where they expect an error object.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Only ever a path on this site — never a caller-supplied absolute URL,
    // which would turn the login page into an open redirect.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (
    pathname.startsWith("/creator") &&
    session.role !== "CREATOR" &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (pathname.startsWith("/brand") && session.role !== "BRAND") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/creator/:path*",
    "/admin/:path*",
    "/brand/:path*",
    "/api/:path*",
  ],
};
