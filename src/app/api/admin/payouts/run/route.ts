import { z } from "zod";
import { fail, ok, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { runCreatorPayouts } from "@/lib/payouts";

/**
 * An administrator paying the creators by hand.
 *
 * The work itself is in `runCreatorPayouts`, which the scheduled run on the 1st
 * and the 15th calls too. This route is the person-shaped way in: it checks who
 * is asking, then hands over. Keeping one implementation is the point, because
 * two routines that both move money would eventually disagree about who is owed
 * what, and the disagreement would be discovered by a creator.
 */
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const schema = z.object({
  /** Nothing is sent unless this is explicitly true. */
  send: z.boolean().default(false),
  /** Below this a transfer costs more in fees than it moves. */
  minimumPence: z.number().int().min(0).max(100_00).default(500),
});

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "payout-run"), 10, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  const result = await runCreatorPayouts(parsed.data);
  if ("notReady" in result) return fail(result.notReady, 503);
  return ok(result);
}
