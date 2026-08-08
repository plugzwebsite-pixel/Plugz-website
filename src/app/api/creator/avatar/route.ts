import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { storeAvatar, removeStoredAvatar } from "@/lib/avatar";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Image work is CPU-bound and the upload can be several megabytes. */
export const runtime = "nodejs";
export const maxDuration = 30;

/** Replace the signed-in creator's portrait. */
export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "avatar"), 10, 10 * 60_000);
  if (!limit.ok) return fail("Too many uploads. Try again in a few minutes.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok || !access.profileId) {
    return fail("You don't have access to this.", 403);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Couldn't read that upload.", 400);
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) return fail("Choose an image first.", 400);

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: { id: true, avatarUrl: true },
  });
  if (!profile) return fail("Profile not found.", 404);

  const stored = await storeAvatar(file, profile.id);
  if (!stored.ok) return fail(stored.error, 400);

  await db.creatorProfile.update({
    where: { id: profile.id },
    data: { avatarUrl: stored.url },
  });

  // Only once the new one is safely recorded.
  await removeStoredAvatar(profile.avatarUrl);

  return ok({ avatarUrl: stored.url });
}

/** Drop the portrait and fall back to the creator's initials. */
export async function DELETE() {
  const access = await checkCreatorAccess();
  if (!access.ok || !access.profileId) {
    return fail("You don't have access to this.", 403);
  }

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: { avatarUrl: true },
  });

  await db.creatorProfile.update({
    where: { id: access.profileId },
    data: { avatarUrl: null },
  });
  await removeStoredAvatar(profile?.avatarUrl);

  return ok({ removed: true });
}
