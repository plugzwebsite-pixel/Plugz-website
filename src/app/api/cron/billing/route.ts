import { ok, fail } from "@/lib/http";
import { cronCallerIsAllowed } from "@/lib/cron-auth";
import { runBillingCycle, previewBillingCycle } from "@/lib/billing-cycle";
import { syncPlatformPayouts } from "@/lib/platform-payouts";

/**
 * Invoicing the brands, nightly.
 *
 * A sale clears its return window on its own. Until this existed, somebody then
 * had to notice, work out what each brand owed, and raise an invoice. That is
 * the step where a growing platform quietly stops billing people.
 *
 * GET reports what the next run would do and changes nothing, so a monitor can
 * be pointed at it and a person can see what is about to happen.
 */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);
  return ok(await previewBillingCycle());
}

export async function POST(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);

  try {
    const result = await runBillingCycle();

    // Logged because this runs unattended, and a silent job is one nobody
    // notices has stopped. Every line here is money being asked for.
    console.log(
      "[cron/billing] considered " + result.considered + " brands, raised " +
      result.raised.length + ", sent " + result.sent.length +
      ", skipped " + result.skipped.length + ", failed " + result.failed.length
    );
    for (const r of result.raised) {
      console.log("[cron/billing] " + r.number + " to " + r.brand + " for £" + (r.amountPence / 100).toFixed(2));
    }
    for (const f of result.failed) {
      console.error("[cron/billing] could not send to " + f.brand + ": " + f.reason);
    }

    // Reconcile the company's own income while we are here. The webhook keeps
    // this current in normal running; reading the list again nightly is what
    // covers a missed event, a disabled endpoint or a rotated secret, none of
    // which should mean the company's books are quietly short.
    let synced = { seen: 0, recorded: 0 };
    try {
      synced = await syncPlatformPayouts();
    } catch (err) {
      console.error("[cron/billing] could not reconcile the company payouts:", err);
    }

    return ok({ ...result, companyPayoutsSynced: synced });
  } catch (err) {
    console.error("[cron/billing] the run failed:", err);
    return fail("The billing run failed. Nothing further was invoiced.", 500);
  }
}
