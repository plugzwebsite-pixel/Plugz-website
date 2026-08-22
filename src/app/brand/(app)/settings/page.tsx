import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, Mail, Percent, RotateCcw } from "lucide-react";
import { checkBrandAccess } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * A brand's own settings.
 *
 * The commercial terms are shown but not editable, deliberately. A brand
 * changing its own commission rate or return window would be changing what it
 * pays and what it owes, which is an agreement between two parties rather than
 * a setting. They are here so the brand can see what was agreed and query it if
 * it looks wrong.
 */
export default async function BrandSettingsPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const brand = await db.brand.findUnique({
    where: { id: access.brandId },
    select: {
      name: true,
      websiteUrl: true,
      status: true,
      platform: true,
      commissionRate: true,
      returnWindowDays: true,
      settlementDays: true,
      contactEmail: true,
    },
  });

  const terms = [
    {
      icon: Percent,
      label: "Commission",
      value: `${Number(brand?.commissionRate ?? 0)}%`,
      sub: "of each confirmed sale",
    },
    {
      icon: RotateCcw,
      label: "Return window",
      value: `${brand?.returnWindowDays ?? 0} days`,
      sub: "before a sale is confirmed",
    },
    {
      icon: Mail,
      label: "Settlement",
      value: `${brand?.settlementDays ?? 0} days`,
      sub: "after a sale is confirmed",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-strong">
          Settings
        </h1>
        <p className="mt-2 text-text-muted">
          Your account and the terms we agreed with you.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 size={17} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">{brand?.name}</h2>
          <Badge tone={brand?.status === "ACTIVE" ? "green" : "amber"}>
            {(brand?.status ?? "").charAt(0) + (brand?.status ?? "").slice(1).toLowerCase()}
          </Badge>
          {brand?.platform === "SHOPIFY" && <Badge tone="neutral">Shopify</Badge>}
        </div>
        {brand?.websiteUrl && (
          <p className="mt-2 truncate text-sm text-text-muted">{brand.websiteUrl}</p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {terms.map((t) => (
            <div key={t.label} className="rounded-sm border border-border bg-surface-2 p-4">
              <div className="flex items-center gap-1.5 text-text-faint">
                <t.icon size={13} />
                <span className="text-xs uppercase tracking-wide">{t.label}</span>
              </div>
              <p className="mt-1.5 font-display text-xl font-semibold text-text-strong">
                {t.value}
              </p>
              <p className="text-xs text-text-faint">{t.sub}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-text-muted">
          These were agreed when your account was set up and cannot be changed
          here. If any of them looks wrong, tell us and we will put it right
          before your next invoice.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
