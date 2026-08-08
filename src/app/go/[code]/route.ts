import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  ATTRIBUTION_COOKIE,
  buildDestination,
  clientIp,
  hashIp,
  isBot,
} from "@/lib/tracking";

/**
 * The Pluggz affiliate redirect — the single route the whole business runs on.
 *
 * A creator publishes pluggz.com/go/<code> to social. Every hit is recorded as
 * a Click, stamped with an attribution session, and bounced on to the brand.
 * The code never changes, so a link stays alive even when its destination is
 * swapped from a placeholder to the real affiliate URL later.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where to send someone whose link has died.
 *
 * `new URL(req.url).origin` is the address nginx dialled, not the one the
 * shopper typed — behind the proxy it reads localhost:3000, so a dead link sent
 * them nowhere at all. Prefer the configured public origin, then the host nginx
 * forwarded, and only then whatever the request claims.
 */
function publicOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const origin = publicOrigin(req);

  const link = await db.trackingLink.findUnique({
    where: { code },
    select: {
      id: true,
      destinationUrl: true,
      creatorProduct: {
        select: {
          live: true,
          product: {
            select: {
              brand: {
                select: {
                  trackingMethod: true,
                  deepLinkPattern: true,
                  publisherId: true,
                  attributionWindowDays: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // A dead or unpublished link still came from a real creator post, so send the
  // shopper somewhere useful rather than showing them an error.
  if (!link || !link.creatorProduct.live) {
    return noStore(NextResponse.redirect(`${origin}/`, 302));
  }

  const brand = link.creatorProduct.product.brand;

  // Reuse the shopper's existing attribution session if they already have one,
  // so a sale can be tied back to the click that earned it.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const existing = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))
    ?.split("=")[1];
  const sessionId = existing || randomUUID();

  const userAgent = req.headers.get("user-agent");
  const bot = isBot(userAgent);

  // Bots get redirected but never counted — a crawler must not inflate a
  // creator's click numbers or their ranking.
  let clickRef = sessionId;
  if (!bot) {
    const ip = clientIp(req.headers);
    const [click] = await db.$transaction([
      db.click.create({
        data: {
          trackingLinkId: link.id,
          sessionId,
          ipHash: ip ? hashIp(ip) : null,
          userAgent: userAgent?.slice(0, 400) ?? null,
          referrer: req.headers.get("referer")?.slice(0, 400) ?? null,
        },
        select: { id: true },
      }),
      db.trackingLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
        select: { id: true },
      }),
    ]);
    clickRef = click.id;
  }

  const destination = buildDestination(link.destinationUrl, brand, clickRef);
  const res = NextResponse.redirect(destination, 302);

  if (!bot) {
    res.cookies.set(ATTRIBUTION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: brand.attributionWindowDays * 24 * 60 * 60,
    });
  }

  return noStore(res);
}

/** Destinations change, so nothing about this redirect may ever be cached. */
function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
