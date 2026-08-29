import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkCreatorAccess } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PayoutSetup } from "@/components/creator/payout-setup";
import { Badge } from "@/components/ui/primitives";
import { gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

const stageLabel: Record<string, string> = {
  PENDING: "In the returns window",
  VERIFIED: "Cleared, waiting for the brand to settle",
  PAID_TO_PLUGGZ: "Settled, due on the next run",
  PAID_TO_CREATOR: "Paid to you",
};

export default async function CreatorPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; again?: string }>;
}) {
  const access = await checkCreatorAccess();
  if (!access.ok) redirect(access.redirectTo);

  const params = await searchParams;
  const justReturned = params.done === "1" || params.again === "1";

  const byStage = await db.sale.groupBy({
    by: ["stage"],
    where: { creatorProduct: { profileId: access.profileId }, status: { not: "RETURNED" } },
    _sum: { creatorAmountPence: true },
    _count: true,
  });

  const rows = ["PENDING", "VERIFIED", "PAID_TO_PLUGGZ", "PAID_TO_CREATOR"].map((s) => {
    const row = byStage.find((b) => b.stage === s);
    return {
      stage: s,
      label: stageLabel[s],
      pence: Number(row?._sum.creatorAmountPence ?? 0),
      count: row?._count ?? 0,
    };
  });

  const owed = rows
    .filter((r) => r.stage !== "PAID_TO_CREATOR")
    .reduce((t, r) => t + r.pence, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-strong">Payouts</h1>
        <p className="mt-2 text-text-muted">
          What you have earned, where each sale has got to, and how the money
          reaches you.
        </p>
      </div>

      <PayoutSetup justReturned={justReturned} />

      <div className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-medium text-text-strong">Your earnings</h2>
          <span className="text-sm text-text-muted">
            {gbpFromPence(owed)} on its way to you
          </span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.stage} className="flex items-center justify-between gap-4 px-6 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-text-strong">{r.label}</p>
                <p className="text-xs text-text-faint">
                  {r.count} sale{r.count === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={
                  r.stage === "PAID_TO_CREATOR"
                    ? "text-sm text-text-muted"
                    : "text-sm font-medium text-text-strong"
                }
              >
                {gbpFromPence(r.pence)}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-6 py-3 text-xs text-text-faint">
          A sale clears once the brand&apos;s returns window has passed, which is
          why nothing is paid the day it happens.
        </p>
      </div>
    </div>
  );
}
