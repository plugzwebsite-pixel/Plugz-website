import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const TERMS_VERSION = "2026-07-01";

const schema = z.object({
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, "You must accept the Creator Terms"),
});

/**
 * The creator half of dual consent.
 *
 * An admin can set a creator up on their behalf, but only the creator can put
 * that profile live. This records their acceptance of the Creator Terms &
 * Membership Agreement with a timestamp and version, then releases the
 * profile, which is what makes it visible to shoppers.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return fail("You must be signed in.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("You must accept the Creator Terms to release your profile.", 422);
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true, profileReleasedAt: true },
  });
  if (!profile) return fail("No creator profile found.", 404);
  if (profile.status !== "APPROVED") {
    return fail("Your profile isn't approved yet.", 403);
  }
  if (profile.profileReleasedAt) {
    return ok({ released: true, alreadyReleased: true });
  }

  await db.creatorProfile.update({
    where: { id: profile.id },
    data: {
      profileReleasedAt: new Date(),
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    },
  });

  return ok({ released: true });
}
