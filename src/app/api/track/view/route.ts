import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isBot, ATTRIBUTION_COOKIE, clientIp, hashIp } from "@/lib/tracking";

/**
 * Somebody looked at a product page.
 *
 * Clicks have always been counted; views have not, and the pair is what makes
 * either useful. Two hundred views and one click is a product whose page is not
 * persuading anybody, which is a conversation with the brand about price or
 * photography. One view and one click is a product nobody has seen, which is a
 * conversation about promotion. Clicks alone cannot tell those apart.
 *
 * Called from the browser rather than counted during the render, because the
 * product pages are prerendered and counting on the server would turn every one
 * of them dynamic, undoing the caching the whole site depends on.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  // Generous, because a shopper browsing quickly is normal, and tight enough
  // that nobody can run the number up from one machine.
  const limit = await rateLimit(clientKey(req, "track-view"), 120, 60_000);
  if (!limit.ok) return reply({ ok: false }, 429);

  // Counted the same way clicks are: a crawler must not inflate a creator's
  // numbers or their ranking.
  if (isBot(req.headers.get("user-agent") ?? "")) {
    return reply({ ok: true, counted: false }, 200);
  }

  let body: { listingId?: string };
  try {
    const parsed: unknown = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply({ ok: false }, 400);
    }
    body = parsed;
  } catch {
    return reply({ ok: false }, 400);
  }

  const listingId = body.listingId?.trim();
  if (!listingId) return reply({ ok: false }, 400);

  // The attribution cookie if there is one, so a view and the click it led to
  // share a session.
  //
  // Falling back to a fresh value per request would have made the repeat check
  // below useless for anybody arriving straight from a search engine, since
  // every refresh would look like a different person. The address hash is what
  // clicks already use, identifies nobody further, and makes the check work for
  // everyone.
  const cookie = req.headers.get("cookie") ?? "";
  const fromCookie = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))
    ?.split("=")[1];
  const ip = clientIp(req.headers);
  const session = fromCookie || (ip ? `ip:${hashIp(ip)}` : "unknown");

  // A refresh, or a shopper going back and forth between two products, should
  // not each count again within the hour.
  const recent = await db.productView.findFirst({
    where: {
      creatorProductId: listingId,
      sessionId: session,
      viewedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) return reply({ ok: true, counted: false }, 200);

  try {
    await db.productView.create({
      data: { creatorProductId: listingId, sessionId: session },
    });
  } catch {
    // A listing that has since been removed. Not worth an error on a page the
    // shopper is already looking at.
    return reply({ ok: true, counted: false }, 200);
  }

  return reply({ ok: true, counted: true }, 200);
}
