import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

/**
 * Following a creator.
 *
 * The button has been on every storefront since the first build and did
 * nothing: no handler, no request, nothing written down. It looked like a
 * working feature to everybody who did not press it.
 *
 * Open to anyone signed in rather than gated to the shopper role, the same as
 * saving a product: a creator looking at another creator's storefront is still
 * a person who might want to follow them, and a role check here would only turn
 * somebody away from their own platform.
 *
 * A following on Pluggz is counted separately from the audience a creator
 * brings from Instagram or TikTok, and is deliberately not added to the figure
 * shown beside their name. Folding a handful of follows here into a number that
 * means "their audience" would misrepresent both.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  handle: z.string().min(1),
  /** False to unfollow. Sent explicitly so a retry cannot flip the state. */
  following: z.boolean(),
});

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return fail("Sign in to follow a creator.", 401);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const { handle, following } = parsed.data;

  // Only a creator a visitor could actually be looking at. Without this, a
  // profile still awaiting approval could be followed by posting its handle.
  const profile = await db.creatorProfile.findFirst({
    where: { handle, status: "APPROVED" },
    select: { id: true, userId: true },
  });
  if (!profile) return fail("That creator does not exist.", 404);

  if (profile.userId === user.id) {
    return fail("You cannot follow your own storefront.", 422);
  }

  if (following) {
    // Following twice is following once, so a double tap on a slow connection
    // comes back as success rather than an error.
    await db.creatorFollow.upsert({
      where: { userId_profileId: { userId: user.id, profileId: profile.id } },
      update: {},
      create: { userId: user.id, profileId: profile.id },
    });
  } else {
    await db.creatorFollow
      .delete({
        where: { userId_profileId: { userId: user.id, profileId: profile.id } },
      })
      .catch(() => null); // already gone is the state they asked for
  }

  const followers = await db.creatorFollow.count({ where: { profileId: profile.id } });
  return ok({ following, followers });
}

/** Whether the person reading this page already follows the creator. */
export async function GET(req: Request) {
  const handle = new URL(req.url).searchParams.get("handle") ?? "";
  if (!handle) return fail("Missing handle.", 400);

  const user = await getSession();
  if (!user) return ok({ following: false, signedIn: false });

  const follow = await db.creatorFollow.findFirst({
    where: { userId: user.id, profile: { handle } },
    select: { id: true },
  });
  return ok({ following: Boolean(follow), signedIn: true });
}
