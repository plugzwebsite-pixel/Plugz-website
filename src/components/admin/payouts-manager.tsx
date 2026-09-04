"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Landmark, Send, TriangleAlert, Users } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { gbpFromPence } from "@/lib/utils";

/**
 * Paying the creators, from the screen.
 *
 * Both ways of paying somebody existed before this did, and neither could be
 * reached without a developer: the platform knew what it owed and had no button
 * that paid it. This is that button, twice over, because there are two ways the
 * money genuinely moves.
 *
 * Stripe is the automatic one, and it can only pay from a Stripe balance. Where
 * the brands settle their invoices by bank transfer instead, that balance stays
 * empty and Stripe has nothing to send, so the honest answer is a bank transfer
 * to the creator and a record of it here. That is not a lesser path or a
 * workaround. It is the same amount, taken from the same figure, marked paid in
 * the same place, and it asks for the bank reference so somebody can match it to
 * a statement a year from now.
 *
 * Whichever way is used, the sales behind it are claimed before anybody is
 * marked paid, so a creator cannot be paid twice for the same commission by
 * pressing both.
 */

export type OwedRow = {
  profileId: string;
  handle: string;
  name: string;
  pence: number;
  sales: number;
  stripeReady: boolean;
  requirement: string | null;
};

export type PaidRow = {
  id: string;
  amountPence: number;
  status: "SCHEDULED" | "SENT" | "FAILED";
  paidBy: "STRIPE" | "BANK_TRANSFER" | null;
  reference: string | null;
  stripeTransferId: string | null;
  failureReason: string | null;
  sentAt: string | Date | null;
  runDate: string | Date;
  _count: { sales: number };
  profile: { handle: string; user: { name: string } };
};

const statusTone: Record<string, "amber" | "green" | "cyan" | "neutral"> = {
  SENT: "green",
  SCHEDULED: "cyan",
  FAILED: "amber",
};

function shortDate(d: string | Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PayoutsManager({
  owed,
  paid,
  stripeReady,
  minimumPence,
}: {
  owed: OwedRow[];
  paid: PaidRow[];
  stripeReady: boolean;
  minimumPence: number;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const totalOwed = owed.reduce((t, r) => t + r.pence, 0);
  // Who a Stripe run would actually pay, which is not everybody whose Stripe is
  // ready: a balance under the minimum is carried to the next run. Counting the
  // ready ones instead would promise more than the button delivers.
  const payableByStripe = owed.filter((r) => r.stripeReady && r.pence >= minimumPence);
  const heldUnderMinimum = owed.filter((r) => r.stripeReady && r.pence < minimumPence).length;

  async function recordBankTransfer(row: OwedRow) {
    const reference = window.prompt(
      `Record that ${row.name || "@" + row.handle} has been paid ` +
        `${gbpFromPence(row.pence)} by bank transfer.\n\n` +
        `This covers ${row.sales} sale${row.sales === 1 ? "" : "s"}. Make the transfer ` +
        `from your bank first, then enter its reference here so the payment can be ` +
        `matched to a statement later.`
    );
    if (reference === null) return;
    if (!reference.trim()) {
      toast.error("A reference is needed", "Enter the reference from your bank.");
      return;
    }

    setBusy(row.profileId);
    const res = await postJson<{ amountPence: number; sales: number }>(
      "/api/admin/payouts/record",
      { profileId: row.profileId, reference: reference.trim() }
    );
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't record that payment", res.message);
      return;
    }
    toast.success(
      "Recorded",
      `${gbpFromPence(res.data!.amountPence)} to @${row.handle} across ` +
        `${res.data!.sales} sale${res.data!.sales === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  async function sendByStripe() {
    if (
      !window.confirm(
        `Send ${gbpFromPence(payableByStripe.reduce((t, r) => t + r.pence, 0))} to ` +
          `${payableByStripe.length} creator${payableByStripe.length === 1 ? "" : "s"} through Stripe?\n\n` +
          `This moves real money from the Pluggz Stripe balance. Anybody owed less ` +
          `than ${gbpFromPence(minimumPence)}, or whose Stripe setup is unfinished, ` +
          `is left for next time.`
      )
    ) return;

    setBusy("stripe");
    const res = await postJson<{
      sentCount: number;
      sentPence: number;
      results: { handle: string; outcome: string }[];
    }>("/api/admin/payouts/run", { send: true, minimumPence: 500 });
    setBusy(null);
    if (!res.ok) {
      toast.error("The payout run could not finish", res.message);
      return;
    }

    const held = (res.data!.results || []).filter((r) => r.outcome !== "Sent");
    toast.success(
      `${res.data!.sentCount} paid, ${gbpFromPence(res.data!.sentPence)} sent`,
      held.length
        ? `${held.length} left for next time: ${held
            .slice(0, 2)
            .map((h) => "@" + h.handle + " " + h.outcome.toLowerCase())
            .join("; ")}${held.length > 2 ? ", and others" : ""}`
        : "Everybody owed has been paid."
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Owed to creators now
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Commission from sales the brand has settled, so the money is ours to
              pass on. Nothing here has been paid yet.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold text-text-strong">
              {gbpFromPence(totalOwed)}
            </p>
            <p className="text-xs text-text-faint">
              {owed.length} creator{owed.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {owed.length === 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-text-faint">
            <Users size={15} /> Nothing is owed. Commission appears here once the
            brand behind a sale has paid their invoice.
          </p>
        ) : (
          <>
            {stripeReady && payableByStripe.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-sm bg-surface-2 p-4">
                <Send size={16} className="text-brand-pink" />
                <p className="flex-1 text-sm text-text-muted">
                  {payableByStripe.length} of these can be paid automatically from
                  the Pluggz Stripe balance
                  {heldUnderMinimum > 0
                    ? `. ${heldUnderMinimum} other${heldUnderMinimum === 1 ? " is" : "s are"} ` +
                      `under the ${gbpFromPence(minimumPence)} minimum and carry over`
                    : ""}
                  .
                </p>
                <Button
                  onClick={sendByStripe}
                  disabled={busy !== null}
                  loading={busy === "stripe"}
                >
                  Pay by Stripe
                </Button>
              </div>
            )}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                    <th className="pb-2 font-medium">Creator</th>
                    <th className="pb-2 font-medium">Sales</th>
                    <th className="pb-2 font-medium">Owed</th>
                    <th className="pb-2 font-medium">Stripe</th>
                    <th className="pb-2 text-right font-medium">Pay by bank</th>
                  </tr>
                </thead>
                <tbody>
                  {owed.map((row) => (
                    <tr key={row.profileId} className="border-b border-border/60">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-text-strong">{row.name}</p>
                        <p className="text-xs text-text-faint">@{row.handle}</p>
                      </td>
                      <td className="py-3 pr-3 text-text-muted">{row.sales}</td>
                      <td className="py-3 pr-3 font-display font-semibold text-text-strong">
                        {gbpFromPence(row.pence)}
                      </td>
                      <td className="py-3 pr-3">
                        {row.stripeReady ? (
                          row.pence >= minimumPence ? (
                            <Badge tone="green">Ready</Badge>
                          ) : (
                            <span className="text-xs text-text-faint">
                              Under {gbpFromPence(minimumPence)}
                            </span>
                          )
                        ) : (
                          <span
                            className="text-xs text-text-faint"
                            title={row.requirement ?? undefined}
                          >
                            {row.requirement ? "Not ready" : "Not set up"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => recordBankTransfer(row)}
                          disabled={busy !== null}
                          loading={busy === row.profileId}
                        >
                          <Landmark size={14} /> Record transfer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-text-faint">
              Paying by bank transfer is the route to use when the brands settle
              their invoices into the Pluggz bank account rather than through
              Stripe, because Stripe can only send money it is holding. Make the
              transfer from your bank, then record it here so the creator&apos;s
              earnings and their dashboard stay right.
            </p>
          </>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-text-strong">
          Paid recently
        </h2>
        {paid.length === 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-text-faint">
            <Banknote size={15} /> No creator has been paid yet.
          </p>
        ) : (
          <div className="mt-5 space-y-1">
            {paid.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">
                    {p.profile.user.name}{" "}
                    <span className="text-text-faint">@{p.profile.handle}</span>
                  </p>
                  <p className="text-xs text-text-faint">
                    {p._count.sales} sale{p._count.sales === 1 ? "" : "s"} ·{" "}
                    {shortDate(p.sentAt ?? p.runDate)}
                    {p.paidBy === "BANK_TRANSFER" && p.reference
                      ? ` · bank reference ${p.reference}`
                      : ""}
                    {p.paidBy === "STRIPE" && p.stripeTransferId
                      ? ` · Stripe ${p.stripeTransferId}`
                      : ""}
                  </p>
                  {p.status === "FAILED" && p.failureReason && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-red-400">
                      <TriangleAlert size={13} className="mt-px shrink-0" />
                      <span>
                        {p.failureReason}. These sales stay held against this
                        payment and the next run tries it again, so nobody is paid
                        twice.
                      </span>
                    </p>
                  )}
                </div>
                <span className="font-display text-sm font-semibold text-text">
                  {gbpFromPence(p.amountPence)}
                </span>
                <Badge tone={statusTone[p.status] ?? "neutral"}>
                  {p.status === "SENT"
                    ? p.paidBy === "BANK_TRANSFER"
                      ? "Bank transfer"
                      : "Sent by Stripe"
                    : p.status === "FAILED"
                      ? "Failed"
                      : "In progress"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
