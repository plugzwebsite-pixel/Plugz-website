import Link from "next/link";
import { db } from "@/lib/db";
import { gbpFromPence } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The order confirmation, and the payoff of the whole walkthrough.
 *
 * By the time this renders the sale has already been recorded, so it can show
 * what Pluggz worked out from it, which is the number a brand and a creator
 * each care about, arrived at without anybody sending a spreadsheet.
 */
export default async function DemoCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  const sale = order
    ? await db.sale.findFirst({
        where: { orderRef: order },
        select: {
          valuePence: true,
          creatorAmountPence: true,
          pluggzAmountPence: true,
          creatorRate: true,
          verifiesAt: true,
          creatorProduct: {
            select: {
              slug: true,
              profile: { select: { handle: true, user: { select: { name: true } } } },
            },
          },
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f3ea] text-2xl">
        ✓
      </div>
      <h1 className="mt-5 font-serif text-3xl">Thank you for your order</h1>
      <p className="mt-2 text-[#78716c]">
        {order ? `Order ${order}` : "Your order is confirmed"} · a confirmation
        email is on its way.
      </p>

      {sale ? (
        <div className="mt-10 rounded-sm border border-[#cfe3d4] bg-[#f1f8f2] p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6b45]">
            What Pluggz recorded, automatically
          </p>
          <p className="mt-2 text-sm text-[#3f6f52]">
            The shop sent us this order the moment it completed. No spreadsheet,
            no one keying anything in.
          </p>

          <dl className="mt-5 space-y-2.5 text-sm">
            <Line label="Order value" value={gbpFromPence(sale.valuePence)} />
            <Line
              label={`${sale.creatorProduct.profile.user.name} earns (${Number(sale.creatorRate)}%)`}
              value={gbpFromPence(sale.creatorAmountPence)}
              strong
            />
            <Line label="Pluggz earns" value={gbpFromPence(sale.pluggzAmountPence)} />
            <Line
              label="Clears for payout"
              value={new Date(sale.verifiesAt).toLocaleDateString("en-GB")}
            />
          </dl>

          <p className="mt-5 text-sm text-[#3f6f52]">
            It is on {sale.creatorProduct.profile.user.name}&apos;s dashboard now,
            and on Aurora Atelier&apos;s.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/@${sale.creatorProduct.profile.handle}`}
              className="rounded-sm bg-[#1c1917] px-4 py-2.5 text-xs font-medium tracking-wide text-[#faf8f5]"
            >
              BACK TO PLUGGZ
            </Link>
            <Link
              href="/creator/dashboard"
              className="rounded-sm border border-[#1c1917] px-4 py-2.5 text-xs font-medium tracking-wide"
            >
              SEE THE CREATOR DASHBOARD
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 rounded-sm border border-[#e7dcc4] bg-[#fdf8ec] p-6 text-left text-sm text-[#7a6a45]">
          <p className="font-medium">Nothing was attributed to this order.</p>
          <p className="mt-1">
            The shopper reached the shop without a Pluggz reference, so there is
            no creator to credit. Start again from a creator&apos;s product page
            to see the tracked version.
          </p>
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[#57534e]">{label}</dt>
      <dd className={strong ? "text-lg font-semibold text-[#2f6b45]" : "text-[#1c1917]"}>
        {value}
      </dd>
    </div>
  );
}
