import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Removing a brand enquiry.
 *
 * Enquiries carry no financial records, so there is nothing to guard: a
 * duplicate, a test, or a spam submission goes straight away.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-enquiry-delete"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const enquiry = await db.brandEnquiry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!enquiry) return fail("That enquiry no longer exists.", 404);

  await db.brandEnquiry.delete({ where: { id } });

  return ok({ removed: true });
}
