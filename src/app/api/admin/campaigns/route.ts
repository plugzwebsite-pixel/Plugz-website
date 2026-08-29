import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { campaignSlug, campaignsChanged } from "@/lib/campaigns";

/**
 * Creating and running a campaign storefront.
 *
 * Everything about a campaign is an admin decision, which is the requirement:
 * these are issued, not self served. A creator cannot add themselves and a
 * brand cannot add itself, because the arrangement behind a campaign is agreed
 * commercially before anybody posts anything.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateish = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v) : undefined));

const schema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("create"),
    name: z.string().trim().min(2, "Give the campaign a name").max(120),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    heroImageUrl: z.string().trim().max(1000).optional(),
    brandId: z.string().trim().optional(),
    startsAt: dateish,
    endsAt: dateish,
  }),
  z.object({
    scope: z.literal("update"),
    id: z.string().trim().min(1),
    name: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    heroImageUrl: z.string().trim().max(1000).optional(),
    brandId: z.string().trim().nullable().optional(),
    status: z.enum(["DRAFT", "LIVE", "ENDED"]).optional(),
    startsAt: dateish,
    endsAt: dateish,
  }),
  z.object({
    scope: z.literal("creator"),
    id: z.string().trim().min(1),
    profileId: z.string().trim().min(1),
    include: z.boolean(),
  }),
  z.object({
    scope: z.literal("listing"),
    id: z.string().trim().min(1),
    listingId: z.string().trim().min(1),
    include: z.boolean(),
  }),
]);

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "admin-campaigns"), 60, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.scope === "create") {
    const base = campaignSlug(input.name);
    if (!base) {
      return fail("That name has no letters or numbers in it.", 422, {
        name: "Give the campaign a name",
      });
    }

    // A campaign is a public address, so two with the same name would fight
    // over it. Numbered rather than refused: "Christmas" happens every year.
    let slug = base;
    for (let n = 2; await db.campaign.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${base}-${n}`;
    }

    const made = await db.campaign.create({
      data: {
        name: input.name,
        slug,
        tagline: input.tagline?.trim() || null,
        description: input.description?.trim() || null,
        heroImageUrl: input.heroImageUrl?.trim() || null,
        brandId: input.brandId || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        createdById: admin.user.id,
      },
      select: { id: true, slug: true, name: true, status: true },
    });
    campaignsChanged(made.slug);
    return ok(made, 201);
  }

  if (input.scope === "update") {
    const existing = await db.campaign.findUnique({
      where: { id: input.id },
      select: { slug: true, name: true, _count: { select: { listings: true } } },
    });
    if (!existing) return fail("That campaign doesn't exist.", 404);

    // An empty campaign going live is a public page with nothing on it, which
    // is worse than one that has not launched yet.
    if (input.status === "LIVE" && existing._count.listings === 0) {
      return fail("Add at least one product before putting it live.", 422);
    }

    const renamed = input.name && input.name !== existing.name;
    let slug = existing.slug;
    if (renamed) {
      const base = campaignSlug(input.name!);
      slug = base;
      for (
        let n = 2;
        await db.campaign.findFirst({
          where: { slug, id: { not: input.id } },
          select: { id: true },
        });
        n++
      ) {
        slug = `${base}-${n}`;
      }
    }

    const saved = await db.campaign.update({
      where: { id: input.id },
      data: {
        ...(input.name ? { name: input.name, slug } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline?.trim() || null } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.heroImageUrl !== undefined
          ? { heroImageUrl: input.heroImageUrl?.trim() || null }
          : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId || null } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startsAt ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      },
      select: { id: true, slug: true, name: true, status: true },
    });
    campaignsChanged(existing.slug);
    if (saved.slug !== existing.slug) campaignsChanged(saved.slug);
    return ok({ ...saved, renamed });
  }

  if (input.scope === "creator") {
    const campaign = await db.campaign.findUnique({
      where: { id: input.id },
      select: { slug: true },
    });
    if (!campaign) return fail("That campaign doesn't exist.", 404);

    if (input.include) {
      await db.campaignCreator.upsert({
        where: { campaignId_profileId: { campaignId: input.id, profileId: input.profileId } },
        create: { campaignId: input.id, profileId: input.profileId },
        update: {},
      });
    } else {
      await db.campaignCreator.deleteMany({
        where: { campaignId: input.id, profileId: input.profileId },
      });
    }
    campaignsChanged(campaign.slug);
    return ok({ included: input.include });
  }

  const campaign = await db.campaign.findUnique({
    where: { id: input.id },
    select: { slug: true },
  });
  if (!campaign) return fail("That campaign doesn't exist.", 404);

  if (input.include) {
    await db.campaignListing.upsert({
      where: {
        campaignId_creatorProductId: {
          campaignId: input.id,
          creatorProductId: input.listingId,
        },
      },
      create: { campaignId: input.id, creatorProductId: input.listingId },
      update: {},
    });

    // The creator whose listing it is belongs on the page too, otherwise a
    // campaign shows a product by somebody it does not name.
    const listing = await db.creatorProduct.findUnique({
      where: { id: input.listingId },
      select: { profileId: true },
    });
    if (listing) {
      await db.campaignCreator.upsert({
        where: {
          campaignId_profileId: { campaignId: input.id, profileId: listing.profileId },
        },
        create: { campaignId: input.id, profileId: listing.profileId },
        update: {},
      });
    }
  } else {
    await db.campaignListing.deleteMany({
      where: { campaignId: input.id, creatorProductId: input.listingId },
    });
  }
  campaignsChanged(campaign.slug);
  return ok({ included: input.include });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Which campaign?", 400);

  const c = await db.campaign.findUnique({
    where: { id },
    select: { slug: true, status: true },
  });
  if (!c) return fail("That campaign doesn't exist.", 404);

  // A live campaign may be linked from a post that is still circulating, so
  // deleting one takes a public page away from under whoever shared it.
  if (c.status === "LIVE") {
    return fail("End the campaign before deleting it.", 409);
  }

  await db.campaign.delete({ where: { id } });
  campaignsChanged(c.slug);
  return ok({ removed: true });
}
