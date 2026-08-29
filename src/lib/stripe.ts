import "server-only";
import Stripe from "stripe";

/**
 * Paying creators, through Stripe Connect.
 *
 * Express accounts, deliberately. A creator's bank details, address and
 * identity documents are entered on Stripe's own pages and held by Stripe. We
 * store an account identifier and nothing else, which is the only arrangement
 * where losing our database does not mean losing anybody's bank details.
 *
 * Money moves as a transfer from the Pluggz balance to a creator's connected
 * account, which is what the payout pipeline has always described: a sale
 * clears its return window, the brand settles with us, and the creator's share
 * is sent on. Nothing here decides how much; that was fixed against each sale
 * when it was recorded.
 */

let client: Stripe | null = null;

/**
 * The client, or null when Stripe has not been configured.
 *
 * Read at call time rather than at module load, so switching payouts on is a
 * matter of adding the key and restarting rather than rebuilding. Every screen
 * that touches payouts checks `stripeConfigured()` first and says plainly that
 * it is not set up, which is why nothing here throws for a missing key.
 */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (client) return client;
  client = new Stripe(key, {
    // Pinned. An account that silently follows Stripe's newest version can
    // change shape under a running deployment, and money is the last place
    // anybody wants that surprise.
    apiVersion: "2026-08-26.dahlia",
    appInfo: { name: "Pluggz", url: "https://pluggzofficial.co.uk" },
  });
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Test keys and live keys look alike; only the prefix says which. */
export function stripeIsLive(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}

export class StripeNotReady extends Error {}

/**
 * The creator's connected account, made if they do not have one yet.
 *
 * Nothing about them is sent beyond their email, which Stripe uses to reach
 * them about their own account. Everything else is asked for by Stripe during
 * onboarding, where it belongs.
 */
export async function ensureConnectedAccount(input: {
  existingId: string | null;
  email: string;
  handle: string;
}): Promise<string> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");

  if (input.existingId) {
    try {
      const found = await s.accounts.retrieve(input.existingId);
      if (!found.deleted) return found.id;
    } catch {
      // Deleted at Stripe, or made against a different set of keys, which is
      // exactly what happens on the day test keys are swapped for live ones.
      // Falling through makes a new one rather than failing for ever.
    }
  }

  const account = await s.accounts.create({
    type: "express",
    email: input.email,
    business_type: "individual",
    capabilities: { transfers: { requested: true } },
    business_profile: {
      url: `https://pluggzofficial.co.uk/@${input.handle}`,
      product_description: "Commission on sales earned through a Pluggz storefront",
    },
    metadata: { pluggzHandle: input.handle },
  });
  return account.id;
}

/**
 * A one-time link into Stripe's own onboarding.
 *
 * Short lived and single use by design, so it is generated when the creator
 * asks rather than stored anywhere.
 */
export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");

  const link = await s.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    // Stripe sends them back here whether they finished or gave up part way,
    // and the page works out which by asking Stripe rather than by guessing
    // from which address was used.
    refresh_url: `${origin}/creator/payouts?again=1`,
    return_url: `${origin}/creator/payouts?done=1`,
  });
  return link.url;
}

/** Where a creator manages the account once it exists. */
export async function accountDashboardLink(accountId: string): Promise<string> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");
  const link = await s.accounts.createLoginLink(accountId);
  return link.url;
}

export type AccountState = {
  payoutsEnabled: boolean;
  requirement: string | null;
};

/**
 * What Stripe currently thinks of an account.
 *
 * `payouts_enabled` is the only thing that decides whether money may be sent.
 * The requirement is carried alongside it so a creator who is not ready can be
 * told which document is missing rather than simply refused.
 */
export async function accountState(accountId: string): Promise<AccountState> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");

  const a = await s.accounts.retrieve(accountId);
  const due = a.requirements?.currently_due ?? [];
  const disabled = a.requirements?.disabled_reason ?? null;

  return {
    payoutsEnabled: Boolean(a.payouts_enabled),
    requirement: due.length > 0 ? due.join(", ") : disabled,
  };
}

/**
 * Send a creator their share.
 *
 * `idempotencyKey` is the payout row's own id, which is what stops a retry, a
 * double click or a redeployment mid-run from paying somebody twice. Stripe
 * treats a repeat with the same key as the same request and returns the
 * original transfer rather than making another.
 */
export async function sendTransfer(input: {
  accountId: string;
  amountPence: number;
  payoutId: string;
  description: string;
}): Promise<{ id: string }> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");

  const transfer = await s.transfers.create(
    {
      amount: input.amountPence,
      currency: "gbp",
      destination: input.accountId,
      description: input.description,
      metadata: { pluggzPayoutId: input.payoutId },
    },
    { idempotencyKey: `payout_${input.payoutId}` }
  );
  return { id: transfer.id };
}
