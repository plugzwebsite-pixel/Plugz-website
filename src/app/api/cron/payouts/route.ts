import { ok, fail } from "@/lib/http";
import { cronCallerIsAllowed } from "@/lib/cron-auth";
import { runCreatorPayouts } from "@/lib/payouts";

/**
 * Paying the creators on the 1st and the 15th, without anybody pressing a
 * button.
 *
 * The cadence was agreed with the client and already existed as a promise on
 * the creator dashboard, which said earnings arrive on the 1st and the 15th.
 * Nothing made that true. A person had to remember, and if they forgot, the
 * creators simply were not paid and the dashboard carried on saying they would
 * be.
 *
 * The schedule on the server runs this daily and the decision about whether
 * today is a payout day is made here, next to the cadence itself, rather than
 * being encoded in a crontab line where it would drift out of step with the
 * dashboard's promise.
 */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MINIMUM_PENCE = 500;

/** The 1st and the 15th, matching nextPayoutRun and what creators are told. */
function isPayoutDay(now: Date): boolean {
  const d = now.getUTCDate();
  return d === 1 || d === 15;
}

export async function GET(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);

  const result = await runCreatorPayouts({ send: false, minimumPence: MINIMUM_PENCE });
  if ("notReady" in result) return fail(result.notReady, 503);
  return ok({ ...result, todayIsAPayoutDay: isPayoutDay(new Date()) });
}

export async function POST(req: Request) {
  if (!(await cronCallerIsAllowed(req))) return fail("Not allowed.", 403);

  // An administrator can pay off-cycle; the schedule cannot. Without this the
  // daily job would pay everybody every day.
  const url = new URL(req.url);
  const forced = url.searchParams.get("force") === "1";
  const now = new Date();

  if (!forced && !isPayoutDay(now)) {
    return ok({
      skipped: true,
      reason: "Creators are paid on the 1st and the 15th. Today is neither.",
    });
  }

  try {
    const result = await runCreatorPayouts({ send: true, minimumPence: MINIMUM_PENCE });
    if ("notReady" in result) return fail(result.notReady, 503);

    console.log(
      "[cron/payouts] " + result.sentCount + " of " + result.creators + " creators paid, £" +
      (result.sentPence / 100).toFixed(2) + " sent" + (result.live ? " (live)" : " (test keys)")
    );
    for (const r of result.results) {
      if (r.outcome !== "Sent") {
        console.warn("[cron/payouts] @" + r.handle + ": " + r.outcome);
      }
    }

    return ok(result);
  } catch (err) {
    console.error("[cron/payouts] the run failed:", err);
    return fail("The payout run failed.", 500);
  }
}
