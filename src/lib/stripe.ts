import "server-only";
import Stripe from "stripe";

/**
 * Paying creators, through Stripe Connect.
 *
 * A creator's bank details, address and identity documents are entered on
 * Stripe's own pages and held by Stripe. We store an account identifier and
 * nothing else, which is the only arrangement where losing our database does
 * not mean losing anybody's bank details.
 *
 * Accounts are made through the v2 accounts API. Stripe now refuses to create
 * accounts the old way for an integration built today, and says so in as many
 * words, so there is no older path to fall back to. The account is a recipient:
 * it can be sent money and can pay that money out to a bank, and it cannot take
 * payments from anybody. That is the whole of what a creator needs.
 *
 * Money still moves as a transfer, which is a v1 call and works against a v2
 * account once its transfers capability is active. That is the same pipeline
 * this has always described: a sale clears its return window, the brand settles
 * with us, and the creator's share is sent on. Nothing here decides how much;
 * that was fixed against each sale when it was recorded.
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

/** Everything we ever ask Stripe to send back about an account. */
const INCLUDE = ["configuration.recipient", "requirements"] as const;

function storefrontUrl(handle: string): string {
  return `https://pluggzofficial.co.uk/@${handle}`;
}

/**
 * The creator's connected account, made if they do not have one yet.
 *
 * Nothing about them is sent beyond their email and their storefront address.
 * The email is how Stripe reaches them about their own account; the storefront
 * is a thing Stripe would otherwise stop and ask them to type, and we already
 * know it. Everything else is asked for by Stripe during onboarding, where it
 * belongs.
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
      const found = await s.v2.core.accounts.retrieve(input.existingId);
      if (found?.id) return found.id;
    } catch {
      // Closed at Stripe, or made against a different set of keys, which is
      // exactly what happens on the day test keys are swapped for live ones.
      // Falling through makes a new one rather than failing for ever.
    }
  }

  const account = await s.v2.core.accounts.create({
    contact_email: input.email,
    display_name: `@${input.handle}`,
    // The hosted pages a creator sees, and afterwards the small dashboard where
    // they can change their own bank details without going through us.
    dashboard: "express",
    metadata: { pluggzHandle: input.handle },
    identity: { country: "gb", entity_type: "individual" },
    defaults: {
      currency: "gbp",
      profile: { business_url: storefrontUrl(input.handle) },
      // Pluggz carries the Stripe fees and any losses, rather than netting them
      // off a creator's commission. A creator who is told they earned nine
      // pounds should receive nine pounds.
      responsibilities: { fees_collector: "application", losses_collector: "application" },
    },
    configuration: {
      recipient: {
        capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
      },
    },
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

  const link = await s.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        // Stripe sends them back here whether they finished or gave up part
        // way, and the page works out which by asking Stripe rather than by
        // guessing from which address was used.
        refresh_url: `${origin}/creator/payouts?again=1`,
        return_url: `${origin}/creator/payouts?done=1`,
      },
    },
  });
  return link.url;
}

/**
 * Where a creator manages the account once it exists.
 *
 * Only ever reached after onboarding is finished, which is also the only time
 * Stripe will issue one of these.
 */
export async function accountDashboardLink(accountId: string): Promise<string> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");
  const link = await s.accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Requirement field paths, said the way a person would say them.
 *
 * Stripe names these as paths into the account, which is right for an API and
 * useless on a creator's screen. Anything not listed falls back to the path
 * itself, so a requirement Stripe adds later is still shown rather than
 * quietly swallowed.
 */
const PLAIN_ENGLISH: [RegExp, string][] = [
  [/^external_account/, "their bank account"],
  [/^identity\.attestations\.terms_of_service/, "accepting Stripe's terms"],
  [/^identity\.individual\.(given_name|surname|full_name)/, "their name"],
  [/^identity\.individual\.date_of_birth/, "their date of birth"],
  [/^identity\.individual\.address/, "their address"],
  [/^identity\.individual\.(id_number|verification|documents)/, "proof of identity"],
  [/^identity\.(business_details|company)\.documents/, "a company document"],
  [/^identity\.individual\.phone/, "a phone number"],
  [/^identity\.individual\.email/, "an email address"],
  [/^defaults\.profile\.business_url/, "a link to their storefront"],
  [/^defaults\.profile/, "a few details about what they do"],
];

function humanise(paths: string[]): string | null {
  const seen: string[] = [];
  for (const path of paths) {
    const match = PLAIN_ENGLISH.find(([pattern]) => pattern.test(path));
    const said = match ? match[1] : path;
    if (!seen.includes(said)) seen.push(said);
  }
  if (seen.length === 0) return null;
  if (seen.length === 1) return `Stripe still needs ${seen[0]}.`;
  const last = seen.pop() as string;
  return `Stripe still needs ${seen.join(", ")} and ${last}.`;
}

export type AccountState = {
  /**
   * Whether Stripe will both accept money for them and pass it on to their
   * bank. Both halves matter: an account that can be sent money but cannot pay
   * it out leaves a creator's earnings sitting in a Stripe balance they cannot
   * reach, which is worse than holding the payout and telling them why.
   */
  payoutsEnabled: boolean;
  requirement: string | null;
};

/**
 * What Stripe currently thinks of an account.
 *
 * The requirement is carried alongside so a creator who is not ready can be
 * told what is missing rather than simply refused, and so an admin looking at
 * a held payout can see the reason without opening Stripe.
 */
export async function accountState(accountId: string): Promise<AccountState> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");

  const account = await s.v2.core.accounts.retrieve(accountId, { include: [...INCLUDE] });
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;

  const canReceive = balance?.stripe_transfers?.status === "active";
  const canPayOut = balance?.payouts?.status === "active";

  const outstanding = (account.requirements?.entries ?? [])
    .filter((entry) => entry.awaiting_action_from === "user")
    .map((entry) => entry.description)
    .filter((description): description is string => Boolean(description));

  return {
    payoutsEnabled: canReceive && canPayOut,
    requirement: humanise(outstanding),
  };
}

// --- billing the brands -----------------------------------------------------
//
// The other direction. Commission owed by a brand is raised as an invoice at
// Stripe and paid on Stripe's own hosted page, so card and bank details never
// reach this application, exactly as with creator payouts. Stripe then tells us
// it was paid, and that is what releases the creators' share.

/**
 * The brand's customer record at Stripe, made if it has not got one.
 *
 * Only a name and an address to send the invoice to. Nothing about how they
 * pay is asked for here; that happens on the page they are sent to.
 */
export async function ensureBrandCustomer(input: {
  existingId: string | null;
  brandId: string;
  name: string;
  email: string | null;
}): Promise<string> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Billing is not switched on yet.");

  if (input.existingId) {
    try {
      const found = await s.customers.retrieve(input.existingId);
      if (!found.deleted) return found.id;
    } catch {
      // Gone at Stripe, or made against a different set of keys, which is what
      // happens the day test keys become live ones. Make a new one rather than
      // failing for ever.
    }
  }

  const customer = await s.customers.create({
    name: input.name,
    email: input.email ?? undefined,
    description: "Pluggz commission account",
    metadata: { pluggzBrandId: input.brandId },
  });
  return customer.id;
}

/**
 * Raise the invoice at Stripe and send it.
 *
 * `collection_method: send_invoice` rather than charging a card on file: a
 * brand is a business being billed, not a subscriber, and it should be able to
 * pay by transfer or card on its own terms within the days it was given.
 *
 * The invoice is finalised before it is sent, which is what fixes the amount.
 * After that Stripe will not let it quietly change, which is the same property
 * the Pluggz record relies on.
 */
export async function sendBrandInvoice(input: {
  customerId: string;
  amountPence: number;
  number: string;
  brandName: string;
  daysUntilDue: number;
  invoiceId: string;
  lineDescription: string;
}): Promise<{ id: string; hostedInvoiceUrl: string | null; pdfUrl: string | null }> {
  const s = stripe();
  if (!s) throw new StripeNotReady("Billing is not switched on yet.");

  // Made first and items attached to it explicitly, so a stray pending item on
  // that customer cannot be swept onto this brand's bill.
  const invoice = await s.invoices.create(
    {
      customer: input.customerId,
      collection_method: "send_invoice",
      days_until_due: input.daysUntilDue,
      currency: "gbp",
      description: "Pluggz commission, " + input.number,
      metadata: { pluggzInvoiceId: input.invoiceId, pluggzNumber: input.number },
      pending_invoice_items_behavior: "exclude",
      auto_advance: false,
    },
    { idempotencyKey: "invoice_create_" + input.invoiceId }
  );

  await s.invoiceItems.create(
    {
      customer: input.customerId,
      invoice: invoice.id,
      amount: input.amountPence,
      currency: "gbp",
      description: input.lineDescription,
    },
    { idempotencyKey: "invoice_item_" + input.invoiceId }
  );

  const finalised = await s.invoices.finalizeInvoice(invoice.id as string);
  const sent = await s.invoices.sendInvoice(finalised.id as string);

  return {
    id: sent.id as string,
    hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
    pdfUrl: sent.invoice_pdf ?? null,
  };
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/**
 * Check that a webhook really came from Stripe.
 *
 * Over the raw bytes, never a re-serialised object: the signature covers
 * exactly what was sent, and JSON.parse followed by JSON.stringify does not
 * reliably give the same bytes back. This endpoint moves sales along, so an
 * unsigned request that could reach it would let anybody mark their own
 * invoice paid.
 */
export function verifyWebhook(rawBody: string, signature: string | null) {
  const s = stripe();
  if (!s) throw new StripeNotReady("Payouts are not switched on yet.");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new StripeNotReady("The webhook signing secret is not set.");
  if (!signature) throw new Error("No signature on that request.");
  return s.webhooks.constructEvent(rawBody, signature, secret);
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
