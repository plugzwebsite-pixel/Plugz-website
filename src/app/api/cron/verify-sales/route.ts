import { ok, fail } from "@/lib/http";
import { cronCallerIsAllowed } from "@/lib/cron-auth";
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

export async function GET(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);
  return ok(await pendingVerificationCounts());
}

export async function POST(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);

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
