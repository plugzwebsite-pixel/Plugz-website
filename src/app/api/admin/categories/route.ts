import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { categoriesChanged, slugify } from "@/lib/categories";
import { z } from "zod";

/**
 * Managing the lifestyle categories.
 *
 * The one thing to be careful with is the name. `Product.category` is free
 * text written by the scraper and the importer, not a foreign key, so a rename
 * has to rewrite every product carrying the old name or those products fall
 * out of their own category page. That happens here, in one transaction.
 */
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Give a full web address")
  // Only https for anything rendered on the site: a http image is blocked as
  // mixed content and simply does not appear.
  .refine((v) => v === "" || v.startsWith("https://"), "Has to start with https://");

const createSchema = z.object({
  name: z.string().trim().min(2, "Give it a name").max(48),
  emoji: z.string().trim().max(8).default(""),
  coverUrl: url.default(""),
  sortOrder: z.number().int().min(0).max(999).default(0),
  inNav: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Give it a name").max(48).optional(),
  emoji: z.string().trim().max(8).optional(),
  coverUrl: url.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  inNav: z.boolean().optional(),
  active: z.boolean().optional(),
  bannerImageUrl: url.optional(),
  bannerHref: url.optional(),
  bannerLabel: z.string().trim().max(80).optional(),
  bannerActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, createSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const slug = slugify(input.name);
  if (!slug) return fail("That name has no letters or numbers in it.", 422, { name: "Give it a real name" });

  const clash = await db.category.findFirst({
    where: { OR: [{ name: input.name }, { slug }] },
    select: { name: true },
  });
  if (clash) {
    return fail(`${clash.name} already exists.`, 409, { name: "Already a category" });
  }

  const category = await db.category.create({
    data: {
      name: input.name,
      slug,
      emoji: input.emoji,
      coverUrl: input.coverUrl || null,
      sortOrder: input.sortOrder,
      inNav: input.inNav,
    },
  });

  categoriesChanged();
  return ok({ id: category.id, slug }, 201);
}

export async function PATCH(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.success) return parsed.response;
  const { id, ...changes } = parsed.data;

  const existing = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return fail("That category no longer exists.", 404);

  const renaming = changes.name !== undefined && changes.name !== existing.name;
  const slug = renaming ? slugify(changes.name!) : undefined;

  if (renaming) {
    if (!slug) return fail("That name has no letters or numbers in it.", 422, { name: "Give it a real name" });
    const clash = await db.category.findFirst({
      where: { id: { not: id }, OR: [{ name: changes.name! }, { slug }] },
      select: { name: true },
    });
    if (clash) return fail(`${clash.name} already exists.`, 409, { name: "Already a category" });
  }

  // Empty string means "clear this", which is not the same as "leave it alone".
  const blankToNull = (v: string | undefined) =>
    v === undefined ? undefined : v === "" ? null : v;

  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(slug ? { slug } : {}),
        ...(changes.emoji !== undefined ? { emoji: changes.emoji } : {}),
        ...(changes.coverUrl !== undefined ? { coverUrl: blankToNull(changes.coverUrl) } : {}),
        ...(changes.sortOrder !== undefined ? { sortOrder: changes.sortOrder } : {}),
        ...(changes.inNav !== undefined ? { inNav: changes.inNav } : {}),
        ...(changes.active !== undefined ? { active: changes.active } : {}),
        ...(changes.bannerImageUrl !== undefined
          ? { bannerImageUrl: blankToNull(changes.bannerImageUrl) }
          : {}),
        ...(changes.bannerHref !== undefined ? { bannerHref: blankToNull(changes.bannerHref) } : {}),
        ...(changes.bannerLabel !== undefined ? { bannerLabel: blankToNull(changes.bannerLabel) } : {}),
        ...(changes.bannerActive !== undefined ? { bannerActive: changes.bannerActive } : {}),
      },
    });

    // Products carry the category name, so a rename has to take them with it.
    if (renaming) {
      await tx.product.updateMany({
        where: { category: existing.name },
        data: { category: changes.name! },
      });
      await tx.creatorProfile.updateMany({
        where: { category: existing.name },
        data: { category: changes.name! },
      });
    }
  });

  categoriesChanged();
  return ok({ id, renamed: renaming });
}

export async function DELETE(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Which one?", 400);

  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!category) return fail("That category no longer exists.", 404);

  const inUse = await db.product.count({ where: { category: category.name } });
  if (inUse > 0) {
    // Deleting would leave those products pointing at a category page that
    // 404s. Hiding it takes it off the site and keeps them findable.
    return fail(
      `${inUse} product${inUse === 1 ? " is" : "s are"} in ${category.name}. Hide it instead, or move them first.`,
      409,
      { id: "Still in use" }
    );
  }

  await db.category.delete({ where: { id } });
  categoriesChanged();
  return ok({ removed: true });
}
