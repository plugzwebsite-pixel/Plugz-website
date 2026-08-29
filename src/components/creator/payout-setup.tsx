"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Banknote, ExternalLink, ShieldCheck } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

/**
 * Setting up how a creator gets paid.
 *
 * Everything to do with a bank account happens on Stripe's own pages. This
 * screen has one job: send them there, and afterwards say whether Stripe will
 * pay them yet. It deliberately has no field to type anything into, which is
 * the point rather than an omission.
 */

type State = {
  configured: boolean;
  started?: boolean;
  payoutsEnabled?: boolean;
  requirement?: string | null;
  stale?: boolean;
};

export function PayoutSetup({ justReturned }: { justReturned: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function refresh() {
    try {
      const res = await fetch("/api/creator/payouts");
      const json = await res.json().catch(() => null);
      if (json?.ok) setState(json.data);
      else setState({ configured: false });
    } catch {
      setState({ configured: false });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Coming back from Stripe is the one moment our copy is certainly out of
  // date, and also the moment the creator is looking for confirmation.
  useEffect(() => {
    if (justReturned) void refresh();
  }, [justReturned]);

  async function start() {
    setBusy(true);
    const res = await postJson<{ url: string; kind: string }>("/api/creator/payouts", {});
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't open that", res.message);
      return;
    }
    window.location.href = res.data!.url;
  }

  if (!state) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-sm text-text-faint">Checking your payout setup...</p>
      </div>
    );
  }

  if (!state.configured) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Banknote size={18} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">Getting paid</h2>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Payouts are not switched on yet. Your earnings are still being counted
          and nothing is lost. We will tell you the moment you can set this up.
        </p>
      </div>
    );
  }

  const ready = state.payoutsEnabled === true;

  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Banknote size={18} className="text-text-muted" />
        <h2 className="font-medium text-text-strong">Getting paid</h2>
        {ready ? (
          <Badge tone="green">
            <BadgeCheck size={11} /> Ready
          </Badge>
        ) : state.started ? (
          <Badge tone="amber">Not finished</Badge>
        ) : (
          <Badge tone="neutral">Not set up</Badge>
        )}
      </div>

      {ready ? (
        <p className="mt-2 text-sm text-text-muted">
          You are set up. Earnings are sent to your account on the 1st and the
          15th, once each sale has passed the brand&apos;s returns window.
        </p>
      ) : state.started ? (
        <>
          <p className="mt-2 text-sm text-text-muted">
            Stripe still needs something before it can pay you.
          </p>
          {state.requirement && (
            <p className="mt-2 rounded-sm border border-border bg-surface-2 p-3 font-mono text-xs text-text-muted">
              {state.requirement}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          Set this up once and your earnings arrive automatically. It takes about
          five minutes.
        </p>
      )}

      <p className="mt-4 flex items-start gap-2 text-sm text-text-muted">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent-green" />
        <span>
          Your bank details are entered on Stripe&apos;s own pages and held by
          Stripe. Pluggz never sees them and never stores them.
        </span>
      </p>

      <div className="mt-5">
        <Button loading={busy} onClick={start} variant={ready ? "secondary" : "primary"}>
          {ready ? (
            <>
              <ExternalLink size={15} /> Manage your details
            </>
          ) : state.started ? (
            "Finish setting up"
          ) : (
            "Set up payouts"
          )}
        </Button>
      </div>

      {state.stale && (
        <p className="mt-3 text-xs text-text-faint">
          We could not reach Stripe just now, so this may be a moment out of
          date. Nothing is wrong with your account.
        </p>
      )}
    </div>
  );
}
