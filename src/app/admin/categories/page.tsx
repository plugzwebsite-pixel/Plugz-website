import type { Metadata } from "next";
import { db } from "@/lib/db";
import { allCategories } from "@/lib/categories";
import {
  CategoriesManager,
  type CategoryRow,
} from "@/components/admin/categories-manager";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, counts, raw] = await Promise.all([
    allCategories(),
    // Products carry the category name as text, so the count comes from
    // grouping on that rather than from a relation.
    db.product.groupBy({ by: ["category"], _count: true }),
    db.category.findMany({
      select: {
        id: true,
        bannerImageUrl: true,
        bannerHref: true,
        bannerLabel: true,
        bannerActive: true,
      },
    }),
  ]);

  const byName = new Map(counts.map((c) => [c.category, c._count]));
  const banners = new Map(raw.map((r) => [r.id, r]));

  const rows: CategoryRow[] = categories.map((c) => {
    const b = banners.get(c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      emoji: c.emoji,
      cover: c.cover,
      sortOrder: c.sortOrder,
      inNav: c.inNav,
      active: c.active,
      products: byName.get(c.name) ?? 0,
      bannerImageUrl: b?.bannerImageUrl ?? null,
      bannerHref: b?.bannerHref ?? null,
      bannerLabel: b?.bannerLabel ?? null,
      bannerActive: b?.bannerActive ?? false,
    };
  });

  return <CategoriesManager categories={rows} />;
}
