import type { Metadata } from "next";
import { db } from "@/lib/db";
import { platformDefaultRates } from "@/lib/commission";
import {
  CommissionSettings,
  type Override,
} from "@/components/admin/commission-settings";

export const metadata: Metadata = { title: "Commission settings" };

export default async function CommissionPage() {
  const [rates, rows] = await Promise.all([
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

  return (
    <CommissionSettings
      defaultCreatorRate={rates.creatorRate}
      defaultPluggzRate={rates.pluggzRate}
      overrides={overrides}
    />
  );
}
