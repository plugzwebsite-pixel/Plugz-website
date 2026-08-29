import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";
import {
  CampaignsManager,
  type CampaignRow,
  type Pickable,
} from "@/components/admin/campaigns-manager";

export const metadata: Metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const [campaigns, listings, creators, brands] = await Promise.all([
    db.campaign.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        status: true,
        brand: { select: { name: true } },
        creators: { select: { profileId: true } },
        listings: { select: { creatorProductId: true } },
      },
    }),
    // Only listings a shopper could actually be shown. Putting a hidden one in
    // a campaign would leave a gap on the page rather than a product.
    db.creatorProduct.findMany({
      where: {
        live: true,
        profile: publiclyVisibleCreator,
        product: { brand: publicBrand },
      },
      orderBy: [{ trackingLink: { clickCount: "desc" } }],
      take: 400,
      select: {
        id: true,
        profile: { select: { handle: true } },
        product: {
          select: { name: true, imageUrl: true, brand: { select: { name: true } } },
        },
      },
    }),
    db.creatorProfile.findMany({
      where: publiclyVisibleCreator,
      orderBy: { createdAt: "desc" },
      take: 400,
      select: {
        id: true,
        handle: true,
        category: true,
        avatarUrl: true,
        user: { select: { name: true } },
      },
    }),
    db.brand.findMany({
      where: { demo: false, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    tagline: c.tagline,
    status: c.status,
    brandName: c.brand?.name ?? null,
    creatorIds: c.creators.map((x) => x.profileId),
    listingIds: c.listings.map((x) => x.creatorProductId),
  }));

  const listingOptions: Pickable[] = listings.map((l) => ({
    id: l.id,
    name: l.product.name,
    sub: `${l.product.brand.name} · @${l.profile.handle}`,
    imageUrl: l.product.imageUrl,
  }));

  const creatorOptions: Pickable[] = creators.map((c) => ({
    id: c.id,
    name: c.user.name,
    sub: `@${c.handle} · ${c.category}`,
    imageUrl: c.avatarUrl,
  }));

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Campaign storefronts, issued by the team rather than built by a creator.
        Several creators tell one story on a page of its own, which is what a
        brand sponsors and what no single storefront can hold.
      </p>
      <p className="max-w-2xl text-sm text-text-muted">
        Every product keeps its own creator&apos;s tracking link, so a sale made
        from a campaign page is credited exactly as it would be anywhere else.
        A campaign changes how work is presented, never who earned it.
      </p>

      <CampaignsManager
        campaigns={rows}
        creators={creatorOptions}
        listings={listingOptions}
        brands={brands}
      />
    </div>
  );
}
