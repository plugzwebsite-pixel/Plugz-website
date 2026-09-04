import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { creatorProfileSchema, profileUrl, normalisePlatform } from "@/lib/validation";
import { revalidateStorefront } from "@/lib/revalidate";

/**
 * A creator editing their own profile.
 *
 * This did not exist. The settings screen had every field on it, waited seven
 * hundred milliseconds, and said "Changes saved", which was untrue: nothing
 * left the browser. A creator correcting their own name was told it had worked
 * and it had not, which is worse than the screen not being there at all, and it
 * is why every follower count on the platform is still zero.
 *
 * The handle is deliberately absent. Every tracking link already posted
 * resolves through it, so changing it would break work creators have already
 * done and links other people have already shared.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const limit = await rateLimit(clientKey(req, "creator-profile"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);

  const parsed = await parseBody(req, creatorProfileSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: { id: true, handle: true, userId: true },
  });
  if (!profile) return fail("Creators only.", 403);

  // Only rows with a handle are kept. A platform a creator has cleared out
  // should disappear rather than linger as an empty row that renders as a
  // broken link on their storefront.
  const socials = input.socials
    .filter((s) => (s.handle ?? "").trim().length > 0)
    .map((s) => {
      const handle = (s.handle as string).replace(/^@/, "").trim();
      return {
        platform: normalisePlatform(s.platform),
        handle,
        url: profileUrl(s.platform, handle),
        followers: s.followers ?? 0,
      };
    });

  await db.$transaction([
    db.user.update({
      where: { id: profile.userId },
      data: { name: input.name },
    }),
    db.creatorProfile.update({
      where: { id: profile.id },
      data: { bio: input.bio || null, city: input.city || null },
    }),
    // Replaced rather than merged. Working out which row a creator meant to
    // edit, rename or remove is guesswork; the form sends the whole set, so
    // the whole set is what is stored.
    db.socialHandle.deleteMany({ where: { profileId: profile.id } }),
    db.socialHandle.createMany({
      data: socials.map((s) => ({ ...s, profileId: profile.id })),
    }),
  ]);

  // Their name and their following are on their storefront and on the homepage
  // wall, both of which are cached.
  revalidateStorefront(profile.handle);

  return ok({
    saved: true,
    name: input.name,
    socials: socials.map((s) => ({ platform: s.platform, handle: s.handle, followers: s.followers })),
  });
}
