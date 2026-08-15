import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { brandEnquirySchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendBrandEnquiryReceipt } from "@/lib/email";

/**
 * A brand asking to work with Pluggz.
 *
 * Public and unauthenticated, so it's rate limited and never reveals whether
 * an enquiry already exists, for the same reasoning as the waitlist.
 */
export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "brandenquiry"), 5, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, brandEnquirySchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const email = input.contactEmail.toLowerCase();

  const existing = await db.brandEnquiry.findFirst({
    where: { contactEmail: email, status: "NEW" },
    select: { id: true },
  });
  if (existing) {
    // Idempotent and friendly. A second submission isn't an error, and
    // confirming the first one exists would leak who's already talking to us.
    return ok({ received: true, alreadySent: true });
  }

  await db.brandEnquiry.create({
    data: {
      brand: input.brand,
      website: input.website || null,
      contactName: input.contactName,
      contactEmail: email,
      contactRole: input.contactRole || null,
      hasAffiliateProgramme: input.hasAffiliateProgramme,
      networkName: input.hasAffiliateProgramme ? input.networkName || null : null,
      categories: input.categories || null,
      message: input.message || null,
    },
  });

  await sendBrandEnquiryReceipt(email, input.contactName, input.brand);

  return ok({ received: true }, 201);
}
