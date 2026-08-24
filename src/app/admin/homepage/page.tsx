import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";
import { CONTENT_KEYS, siteContentRaw, type ContentKey } from "@/lib/site-content";
import { HomepageManager, type Featurable } from "@/components/admin/homepage-manager";

export const metadata: Metadata = { title: "Homepage" };
export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const [content, listings, creators] = await Promise.all([
    siteContentRaw(),
    // Only what a shopper could actually be shown. Featuring something hidden
    // would put a gap on the homepage rather than a product.
    db.creatorProduct.findMany({
      where: {
        live: true,
        profile: publiclyVisibleCreator,
        product: { brand: publicBrand },
      },
      orderBy: [{ featured: "desc" }, { trackingLink: { clickCount: "desc" } }],
      take: 300,
      select: {
        id: true,
        featured: true,
        profile: { select: { handle: true } },
        product: {
          select: { name: true, imageUrl: true, brand: { select: { name: true } } },
        },
      },
    }),
    db.creatorProfile.findMany({
      where: publiclyVisibleCreator,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        featured: true,
        handle: true,
        category: true,
        avatarUrl: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const products: Featurable[] = listings.map((l) => ({
    id: l.id,
    name: l.product.name,
    sub: `${l.product.brand.name} · @${l.profile.handle}`,
    imageUrl: l.product.imageUrl,
    featured: l.featured,
  }));

  const people: Featurable[] = creators.map((c) => ({
    id: c.id,
    name: c.user.name,
    sub: `@${c.handle} · ${c.category}`,
    imageUrl: c.avatarUrl,
    featured: c.featured,
  }));

  const fields = (Object.keys(CONTENT_KEYS) as ContentKey[]).map((key) => ({
    key,
    label: CONTENT_KEYS[key].label,
    hint: CONTENT_KEYS[key].hint,
    fallback: CONTENT_KEYS[key].fallback,
  }));

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        The wording on the front page, and which creators and products appear on
        it. Featuring something is a separate decision from approving it: every
        approved creator gets a storefront, but the homepage is the team&apos;s
        choice.
      </p>

      <HomepageManager
        content={content as Record<string, string>}
        fields={fields}
        products={products}
        creators={people}
      />
    </div>
  );
}
