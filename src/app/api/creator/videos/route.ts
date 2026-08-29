import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createDirectUpload, deleteVideo, streamConfigured, StreamError } from "@/lib/stream";

/**
 * Starting a video upload for one of the creator's own listings.
 *
 * This hands back a one-time address at Cloudflare and nothing else. The file
 * goes from the creator's browser straight there, so a large clip never passes
 * through this server, is never held in memory, and cannot time out a request.
 *
 * A listing carries one video. Asking for a second replaces the first, which is
 * what a creator means when they upload again after watching their own clip
 * back and deciding it was no good. The old one is deleted at Cloudflare rather
 * than orphaned, because storage there is billed by the minute kept.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ listingId: z.string().trim().min(1) });

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "creator-video"), 20, 60_000);
  if (!limit.ok) return fail("Too many uploads. Try again shortly.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);

  if (!streamConfigured()) {
    return fail("Video uploads are not switched on yet.", 503);
  }

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  // Scoped to this creator's own listings. A creator must not be able to put a
  // video on somebody else's storefront by passing their listing id.
  const listing = await db.creatorProduct.findFirst({
    where: { id: parsed.data.listingId, profileId: access.profileId },
    select: {
      id: true,
      profile: { select: { handle: true } },
      video: { select: { id: true, uid: true } },
    },
  });
  if (!listing) return fail("That listing isn't yours.", 404);

  let upload;
  try {
    upload = await createDirectUpload({
      creatorHandle: listing.profile.handle,
      listingId: listing.id,
    });
  } catch (err) {
    if (err instanceof StreamError) {
      // Out of storage is not a fault and must not be reported as one. It says
      // the account has no minutes left, which the creator can do nothing about
      // and should not be shown a server error for. The status matters too:
      // Cloudflare replaces a 502 from us with its own error page, so the one
      // message worth reading never arrives.
      if (err.isQuota) {
        console.error("[creator/videos] Cloudflare Stream is out of storage:", err.message);
        return fail(
          "Video uploads are paused while we top up our video storage. Nothing else is affected, and we will let you know as soon as it is back.",
          503
        );
      }
      console.error("[creator/videos] Cloudflare Stream refused:", err.message);
      return fail("Couldn't start that upload. Please try again shortly.", 503);
    }
    console.error("[creator/videos] direct upload failed:", err);
    return fail("Couldn't start that upload.", 503);
  }

  const previous = listing.video;

  const row = await db.creatorVideo.upsert({
    where: { creatorProductId: listing.id },
    create: { creatorProductId: listing.id, uid: upload.uid },
    // A replacement starts the whole cycle again, moderation included: the new
    // clip has not been looked at, whatever was decided about the old one.
    update: {
      uid: upload.uid,
      state: "UPLOADING",
      review: "PENDING",
      readyAt: null,
      durationSeconds: null,
      thumbnailUrl: null,
      removedReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
    select: { id: true, uid: true, state: true, review: true },
  });

  // After the row is repointed, so a failure here leaves a stray clip at
  // Cloudflare rather than a row pointing at one that no longer exists.
  if (previous && previous.uid !== upload.uid) {
    void deleteVideo(previous.uid);
  }

  // The row id goes back with the address, so the caller does not have to look
  // the video up again straight afterwards just to poll it.
  return ok({ id: row.id, uid: upload.uid, uploadUrl: upload.uploadUrl }, 201);
}
