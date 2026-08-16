import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";

/**
 * The discount code a brand issued for one creator's link.
 *
 * This is the fallback tracking method for a brand with no programme and no
 * developer: they give each creator a unique code, the shopper types it at
 * their checkout, and the sales import reconciles by it. The code has always
 * been shown on the product page and read by the importer; this is the only
 * way to put one in without database access.
 *
 * Codes are stored exactly as the brand issued them, because the shopper has
 * to type the same string. They are only compared case-insensitively at
 * import, where the shopper's casing cannot be relied on.
 */
const schema = z.object({
  listingId: z.string().min(1),
  discountCode: z
    .string()
    .trim()
    .max(40, "That is longer than any checkout will accept")
    .transform((v) => v.replace(/\s+/g, " "))
    // An empty string clears it, which is how a code is removed.
    .refine((v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(v), {
      message: "Letters, numbers, spaces, dots, hyphens and underscores only",
    }),
});

export async function PATCH(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const { listingId, discountCode } = parsed.data;

  const link = await db.trackingLink.findUnique({
    where: { creatorProductId: listingId },
    select: { id: true },
  });
  if (!link) {
    return fail("That listing has no tracking link to attach a code to.", 404);
  }

  await db.trackingLink.update({
    where: { id: link.id },
    data: { discountCode: discountCode === "" ? null : discountCode },
  });

  return ok({ discountCode: discountCode === "" ? null : discountCode });
}
