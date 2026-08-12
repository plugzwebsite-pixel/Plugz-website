import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Issue the credentials a brand signs its sale postbacks with.
 *
 * The postback endpoint has always verified an HMAC against these, but there
 * was no way to create a pair — so a brand could be onboarded and still have
 * nothing to integrate with.
 *
 * The secret is returned **once**, here, and never again: it is what proves a
 * postback really came from that brand, so it is handed over at the moment it
 * is created and only its stored copy remains. Calling this a second time
 * rolls both, which is also how a leaked secret is dealt with.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "brand-credentials"), 10, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    select: { id: true, name: true, trackingKey: true },
  });
  if (!brand) return fail("That brand doesn't exist.", 404);

  // pz_live_ prefix so a key is recognisable on sight in a brand's config, and
  // obviously not something to paste into a public page.
  const key = `pz_live_${randomBytes(18).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");

  await db.brand.update({
    where: { id: brand.id },
    data: { trackingKey: key, trackingSecret: secret },
  });

  return ok({
    brand: brand.name,
    key,
    secret,
    rolled: Boolean(brand.trackingKey),
    endpoint: "https://pluggzofficial.co.uk/api/track/sale",
  });
}
