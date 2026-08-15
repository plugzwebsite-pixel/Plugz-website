import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { waitlistSchema } from "@/lib/validation";
import { sendWaitlistConfirmation } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "waitlist"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, waitlistSchema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const existing = await db.waitlistEntry.findUnique({ where: { email } });
  if (existing) {
    return ok({ alreadyJoined: true }); // idempotent, feels friendly, no leak
  }

  await db.waitlistEntry.create({
    data: {
      name: parsed.data.name,
      email,
      handle: parsed.data.handle?.replace(/^@/, "") || null,
      interest: parsed.data.interest,
    },
  });
  await sendWaitlistConfirmation(email, parsed.data.name);

  return ok({ joined: true }, 201);
}
