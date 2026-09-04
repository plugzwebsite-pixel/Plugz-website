import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
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
 *
 * The administrator's role is read from the database, never from the session
 * token. The token is issued for seven days and says what was true when it was
 * signed, so somebody removed as an administrator this morning would still be
 * carrying a cookie that calls them one until next week. Everywhere else in the
 * platform re-reads the role for exactly that reason; this door was the one
 * still trusting the cookie, and it is the door in front of the job that sends
 * money.
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

  const session = await getSession();
  if (!session) return false;

  const account = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });
  return account?.role === "ADMIN";
}
