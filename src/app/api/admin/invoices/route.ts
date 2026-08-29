import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { raiseInvoice, settleInvoice, voidInvoice, billableSales } from "@/lib/invoicing";
import { stripeConfigured, ensureBrandCustomer, sendBrandInvoice, StripeNotReady } from "@/lib/stripe";

/**
 * Billing the brands.
 *
 * Four things happen here and they are deliberately separate steps rather than
 * one button. Raising an invoice fixes what is owed. Sending it hands it to
 * Stripe, which emails the brand a page to pay on. Settling it records that the
 * money arrived, which is the moment the creators' share is released. Voiding
 * it puts the sales back if it should not have been raised at all.
 *
 * A brand that would rather pay by bank transfer never touches Stripe: the
 * invoice is raised, the transfer arrives, somebody records it with the bank
 * reference, and the pipeline moves exactly as it would have done.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), brandId: z.string().min(1) }),
  z.object({ action: z.literal("raise"), brandId: z.string().min(1) }),
  z.object({ action: z.literal("send"), invoiceId: z.string().min(1) }),
  z.object({
    action: z.literal("settle"),
    invoiceId: z.string().min(1),
    reference: z.string().trim().max(120).optional(),
  }),
  z.object({ action: z.literal("void"), invoiceId: z.string().min(1) }),
]);

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "admin-invoices"), 40, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.action === "preview") {
    const sales = await billableSales(input.brandId);
    return ok({
      count: sales.length,
      amountPence: sales.reduce((t, s) => t + s.pluggzAmountPence, 0),
      sales: sales.map((s) => ({
        orderRef: s.orderRef,
        productName: s.productName,
        creatorHandle: s.creatorHandle,
        soldAt: s.soldAt,
        valuePence: s.valuePence,
        pluggzAmountPence: s.pluggzAmountPence,
      })),
    });
  }

  if (input.action === "raise") {
    const result = await raiseInvoice(input.brandId);
    if (!result.ok) return fail(result.reason, 422);
    return ok(result);
  }

  if (input.action === "send") {
    if (!stripeConfigured()) {
      return fail(
        "Stripe is not switched on, so an invoice cannot be sent from here. Record the payment when it arrives instead.",
        503
      );
    }

    const invoice = await db.brandInvoice.findUnique({
      where: { id: input.invoiceId },
      select: {
        id: true, number: true, amountPence: true, status: true, dueAt: true,
        stripeInvoiceId: true,
        brand: {
          select: { id: true, name: true, contactEmail: true, stripeCustomerId: true },
        },
      },
    });
    if (!invoice) return fail("That invoice doesn't exist.", 404);
    if (invoice.status === "PAID") return fail("That invoice has already been paid.", 422);
    if (invoice.status === "VOID") return fail("That invoice was cancelled.", 422);
    if (invoice.stripeInvoiceId) return fail("That invoice has already been sent.", 422);
    if (!invoice.brand.contactEmail) {
      return fail("Add a contact email for that brand first, or Stripe has nowhere to send it.", 422);
    }

    try {
      const customerId = await ensureBrandCustomer({
        existingId: invoice.brand.stripeCustomerId,
        brandId: invoice.brand.id,
        name: invoice.brand.name,
        email: invoice.brand.contactEmail,
      });
      if (customerId !== invoice.brand.stripeCustomerId) {
        await db.brand.update({
          where: { id: invoice.brand.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Never fewer than a day, or Stripe is being asked to send something that
      // is overdue on arrival.
      const days = Math.max(
        1,
        Math.ceil((invoice.dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      );

      const sent = await sendBrandInvoice({
        customerId,
        amountPence: invoice.amountPence,
        number: invoice.number,
        brandName: invoice.brand.name,
        daysUntilDue: days,
        invoiceId: invoice.id,
        lineDescription: "Pluggz commission on sales earned through creator storefronts",
      });

      await db.brandInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "SENT",
          issuedAt: new Date(),
          stripeInvoiceId: sent.id,
          hostedInvoiceUrl: sent.hostedInvoiceUrl,
          invoicePdfUrl: sent.pdfUrl,
        },
      });

      return ok({ sent: true, hostedInvoiceUrl: sent.hostedInvoiceUrl });
    } catch (err) {
      if (err instanceof StripeNotReady) return fail(err.message, 503);
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[admin/invoices] Stripe refused to send:", message);
      return fail("Stripe would not send that invoice: " + message.slice(0, 160), 502);
    }
  }

  if (input.action === "settle") {
    const result = await settleInvoice({
      invoiceId: input.invoiceId,
      method: "BANK_TRANSFER",
      reference: input.reference ?? null,
      settledById: admin.user.id,
    });
    if (!result.settled) {
      return fail(
        result.alreadyPaid
          ? "That invoice is already marked as paid."
          : "That invoice cannot be settled.",
        422
      );
    }
    return ok({ settled: true, salesReleased: result.salesMoved });
  }

  const voided = await voidInvoice(input.invoiceId);
  if (!voided.ok) return fail(voided.reason ?? "That invoice cannot be cancelled.", 422);
  return ok({ voided: true });
}
