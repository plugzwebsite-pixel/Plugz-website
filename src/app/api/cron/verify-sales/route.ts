import { timingSafeEqual } from "node:crypto";
import { ok, fail } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { verifyDueSales, pendingVerificationCounts } from "@/lib/verify-sales";

/**
 * The nightly sweep that lets a sale become payable.
 *
 * Two ways in, because they answer different needs. A scheduled job on the
 * server calls it with a shared secret, which is what makes the pipeline run
 * without anyone remembering to. An administrator signed in can call it too, so
 * that a sale sitting one day past its window can be released without waiting
 * for the small hours or asking a developer.
 *
 * GET reports what is waiting and changes nothing, which makes it safe to point
 * a monitor at.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time, so a wrong secret cannot be found by timing the reply. */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function callerIsAllowed(req: Request): Promise<boolean> {
  const expected = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret");
  if (expected && given && secretMatches(given, expected)) return true;

  const user = await getSession();
  return user?.role === "ADMIN";
}

export async function GET(req: Request) {
  if (!(await callerIsAllowed(req))) return fail("Not allowed.", 403);
  return ok(await pendingVerificationCounts());
}

export async function POST(req: Request) {
  if (!(await callerIsAllowed(req))) return fail("Not allowed.", 403);

  try {
    const result = await verifyDueSales();
    // Logged because this runs unattended most of the time, and a silent job is
    // one nobody notices has stopped.
    console.log(
      `[verify-sales] scanned ${result.scanned}, verified ${result.verified}, ` +
        `held by dispute ${result.heldByDispute}`
    );
    return ok(result);
  } catch (err) {
    console.error("[verify-sales] failed:", err);
    return fail("The sweep could not complete.", 500);
  }
}
