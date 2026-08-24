import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { CONTENT_KEYS, siteContentChanged, type ContentKey } from "@/lib/site-content";
import { revalidatePath } from "next/cache";

/**
 * The homepage: its wording, and what is featured on it.
 *
 * Both live here because they are one job. Somebody setting up the front page
 * for a campaign changes the headline and chooses the products in the same
 * sitting, and splitting that across two screens only means saving twice.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("content"),
    values: z.record(z.string(), z.string().max(400)),
  }),
  z.object({
    scope: z.literal("product"),
    listingId: z.string().trim().min(1),
    featured: z.boolean(),
  }),
  z.object({
    scope: z.literal("creator"),
    profileId: z.string().trim().min(1),
    featured: z.boolean(),
  }),
]);

/** Above this the homepage stops being a selection and becomes a catalogue. */
const MAX_FEATURED = 12;

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "admin-homepage"), 60, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.scope === "content") {
    const known = Object.keys(CONTENT_KEYS) as ContentKey[];
    const entries = Object.entries(input.values).filter(([k]) =>
      known.includes(k as ContentKey)
    );
    if (entries.length === 0) return fail("Nothing to save.", 400);

    // A link has to be a link. A strip pointing at "javascript:" or at another
    // site pasted by mistake is on every page of the homepage.
    const href = input.values.stripHref?.trim();
    if (href && !/^\/(?!\/)/.test(href) && !/^https:\/\//i.test(href)) {
      return fail("The strip link must start with / or https://", 422, {
        stripHref: "Use a path on this site, or a full https address",
      });
    }

    await db.$transaction(
      entries.map(([key, value]) =>
        db.siteContent.upsert({
          where: { key },
          create: { key, value: value.trim(), updatedById: admin.user.id },
          update: { value: value.trim(), updatedById: admin.user.id },
        })
      )
    );
    siteContentChanged();
    return ok({ saved: entries.length });
  }

  if (input.scope === "product") {
    if (input.featured) {
      const count = await db.creatorProduct.count({ where: { featured: true } });
      if (count >= MAX_FEATURED) {
        return fail(
          `The homepage holds ${MAX_FEATURED} featured products. Remove one first.`,
          409
        );
      }
    }
    await db.creatorProduct.update({
      where: { id: input.listingId },
      data: { featured: input.featured },
    });
    revalidatePath("/", "page");
    return ok({ featured: input.featured });
  }

  if (input.featured) {
    const count = await db.creatorProfile.count({ where: { featured: true } });
    if (count >= MAX_FEATURED) {
      return fail(
        `The homepage holds ${MAX_FEATURED} featured creators. Remove one first.`,
        409
      );
    }
  }
  await db.creatorProfile.update({
    where: { id: input.profileId },
    data: { featured: input.featured },
  });
  revalidatePath("/", "page");
  return ok({ featured: input.featured });
}
