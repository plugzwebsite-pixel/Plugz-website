import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/auth/session";

/**
 * Who may run a scheduled job.
 *
 * Two ways in, because they answer different needs. The job on the server calls
 * with a shared secret, which is what makes the pipeline run without anyone
 * remembering to. An administrator signed in can call it too, so that something
 * a day overdue can be pushed through without waiting for the small hours or
 * asking a developer.
 *
 * Shared rather than repeated, because these jobs now move money and three
 * copies of a door check is three chances to leave one unlocked.
 */

/** Constant time, so a wrong secret cannot be found by timing the reply. */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function cronCallerIsAllowed(req: Request): Promise<boolean> {
  const expected = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret");
  if (expected && given && secretMatches(given, expected)) return true;

  const user = await getSession();
  return user?.role === "ADMIN";
}
