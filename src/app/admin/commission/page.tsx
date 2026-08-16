import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publicBrand } from "@/lib/queries";
import { platformDefaultRates } from "@/lib/commission";
import {
  CommissionSettings,
  type Override,
  type Party,
  type SeasonalWindow,
} from "@/components/admin/commission-settings";

export const metadata: Metadata = { title: "Rates and terms" };
export const dynamic = "force-dynamic";

export default async function CommissionPage() {
  const [rates, rows, creatorRows, brandRows, windowRows] = await Promise.all([
    platformDefaultRates(),
    db.commissionOverride.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        creatorRate: true,
        pluggzRate: true,
        note: true,
        creatorProfile: {
          select: { handle: true, user: { select: { name: true } } },
        },
        brand: { select: { name: true } },
      },
    }),
    db.creatorProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: { handle: "asc" },
      select: { id: true, handle: true, user: { select: { name: true } } },
    }),
    db.brand.findMany({
      where: { status: "ACTIVE", ...publicBrand },
      orderBy: { name: "asc" },
      select: { id: true, name: true, returnWindowDays: true },
    }),
    db.returnWindowOverride.findMany({
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        label: true,
        days: true,
        startsAt: true,
        endsAt: true,
        brand: { select: { name: true } },
      },
    }),
  ]);

  const overrides: Override[] = rows.map((r) => ({
    id: r.id,
    name: r.creatorProfile
      ? r.creatorProfile.user.name
      : (r.brand?.name ?? "Unknown"),
    type: r.creatorProfile ? "Creator" : "Brand",
    creatorRate: Number(r.creatorRate),
    pluggzRate: Number(r.pluggzRate),
    note: r.note,
  }));

  const creators: Party[] = creatorRows.map((c) => ({
    id: c.id,
    name: `${c.user.name} (@${c.handle})`,
  }));
  const brands: Party[] = brandRows.map((b) => ({
    id: b.id,
    name: b.name,
    returnWindowDays: b.returnWindowDays,
  }));

  const now = Date.now();
  const seasonal: SeasonalWindow[] = windowRows.map((w) => ({
    id: w.id,
    brand: w.brand.name,
    label: w.label,
    days: w.days,
    startsAt: w.startsAt.toISOString(),
    endsAt: w.endsAt.toISOString(),
    active: w.startsAt.getTime() <= now && now <= w.endsAt.getTime(),
    past: w.endsAt.getTime() < now,
  }));

  return (
    <CommissionSettings
      defaultCreatorRate={rates.creatorRate}
      defaultPluggzRate={rates.pluggzRate}
      overrides={overrides}
      creators={creators}
      brands={brands}
      seasonal={seasonal}
    />
  );
}
