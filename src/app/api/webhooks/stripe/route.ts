import { db } from "@/lib/db";
import { verifyWebhook, stripeWebhookConfigured, StripeNotReady } from "@/lib/stripe";
import { settleInvoice } from "@/lib/invoicing";

/**
 * Stripe telling us what happened.
 *
 * One event matters more than the rest: an invoice being paid. That is the
 * moment a brand's commission has actually arrived, and it is what moves that
 * invoice's sales to PAID_TO_PLUGGZ, which is in turn what makes the creators'
 * share payable. Without this the middle of the pipeline needs a person
 * watching a bank account.
 *
 * Three things this is careful about, because it moves money along:
 *
 *   1. The signature is checked against the raw bytes. An endpoint that can
 *      release money on request must be certain the request came from Stripe.
 *   2. Everything is idempotent. Stripe retries until it gets a 2xx, so this
 *      endpoint will be called more than once for the same event as a matter
 *      of course, not as an edge case.
 *   3. An event it does not recognise is acknowledged rather than refused.
 *      Answering 400 to an event we simply do not handle would make Stripe
 *      retry it for days and eventually disable the endpoint.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeWebhookConfigured()) {
    // Nothing signed can be trusted, so nothing is acted on. Answered 200 so
    // Stripe does not retry an endpoint that is deliberately not listening yet.
    console.warn("[webhooks/stripe] an event arrived but no signing secret is set");
    return Response.json({ ok: true, ignored: "not configured" });
  }

  // The raw bytes, exactly as sent. Parsing and re-serialising would change
  // them and the signature would no longer match.
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = verifyWebhook(raw, signature);
  } catch (err) {
    if (err instanceof StripeNotReady) {
      return Response.json({ ok: true, ignored: "not configured" });
    }
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[webhooks/stripe] refused an unsigned or altered event:", message);
    return new Response("Signature check failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid": {
        const stripeInvoice = event.data.object as { id?: string; metadata?: Record<string, string> };
        const ours = stripeInvoice.metadata?.pluggzInvoiceId;

        const invoice = ours
          ? await db.brandInvoice.findUnique({ where: { id: ours }, select: { id: true } })
          : stripeInvoice.id
            ? await db.brandInvoice.findUnique({
                where: { stripeInvoiceId: stripeInvoice.id },
                select: { id: true },
              })
            : null;

        if (!invoice) {
          console.warn("[webhooks/stripe] paid invoice we have no record of:", stripeInvoice.id);
          break;
        }

        const result = await settleInvoice({ invoiceId: invoice.id, method: "STRIPE" });
        console.log(
          "[webhooks/stripe] invoice " + invoice.id +
          (result.settled
            ? " settled, " + result.salesMoved + " sales released"
            : result.alreadyPaid
              ? " was already paid"
              : " could not be settled")
        );
        break;
      }

      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as { id?: string };
        console.warn("[webhooks/stripe] a brand's payment failed:", stripeInvoice.id);
        break;
      }

      case "account.updated": {
        // A creator's account finishing verification. The payout run asks Stripe
        // again anyway, so this only saves it a call; it is never the only thing
        // keeping the record current.
        const account = event.data.object as {
          id?: string;
          payouts_enabled?: boolean;
        };
        if (account.id) {
          await db.creatorProfile.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripePayoutsEnabled: Boolean(account.payouts_enabled) },
          });
        }
        break;
      }

      default:
        // Acknowledged on purpose. See the note at the top.
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry, which is what we want when our own side failed
    // rather than the event being bad.
    console.error("[webhooks/stripe] failed handling " + event.type + ":", err);
    return new Response("Could not process that event", { status: 500 });
  }

  return Response.json({ ok: true, received: event.type });
}
