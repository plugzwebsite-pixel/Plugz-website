import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createDirectUpload, deleteVideo, streamConfigured, StreamError } from "@/lib/stream";
import { stagePendingVideo } from "@/lib/video-replacement";

/**
 * Starting a video upload for one of the creator's own listings.
 *
 * This hands back a one-time address at Cloudflare and nothing else. The file
 * goes from the creator's browser straight there, so a large clip never passes
 * through this server, is never held in memory, and cannot time out a request.
 *
 * A listing carries one live video. A replacement uses `pendingUid` while the
 * existing asset remains untouched, then the poll/webhook promotes it only
 * after Cloudflare confirms it is playable.
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
      video: {
        select: {
          id: true,
          uid: true,
          pendingUid: true,
          state: true,
          review: true,
          durationSeconds: true,
          thumbnailUrl: true,
          removedReason: true,
        },
      },
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

  try {
    if (listing.video) {
      const stalePending = listing.video.pendingUid;
      const staged = await stagePendingVideo({
        id: listing.video.id,
        expectedUid: listing.video.uid,
        expectedPendingUid: stalePending,
        pendingUid: upload.uid,
        pendingReview: "PENDING",
      });
      if (!staged) {
        void deleteVideo(upload.uid);
        return fail("The video changed while this upload was starting. Please try again.", 409);
      }
      const row = await db.creatorVideo.findUniqueOrThrow({
        where: { id: listing.video.id },
        select: {
          id: true,
          uid: true,
          state: true,
          review: true,
          durationSeconds: true,
          thumbnailUrl: true,
          removedReason: true,
        },
      });
      // This creator has deliberately superseded any earlier in-flight admin
      // or creator replacement. Its late webhook no longer matches this row.
      if (stalePending && stalePending !== upload.uid) void deleteVideo(stalePending);
      return ok({
        ...row,
        pendingUid: upload.uid,
        replacementState: "UPLOADING",
        replacing: true,
        uploadUid: upload.uid,
        uploadUrl: upload.uploadUrl,
      }, 201);
    }

    const row = await db.creatorVideo.create({
      data: { creatorProductId: listing.id, uid: upload.uid },
      select: {
        id: true,
        uid: true,
        state: true,
        review: true,
        durationSeconds: true,
        thumbnailUrl: true,
        removedReason: true,
      },
    });
    return ok({
      ...row,
      pendingUid: null,
      replacementState: null,
      replacing: false,
      uploadUid: upload.uid,
      uploadUrl: upload.uploadUrl,
    }, 201);
  } catch (error) {
    void deleteVideo(upload.uid);
    console.error("[creator/videos] couldn't record direct upload:", error);
    return fail("Couldn't start that upload.", 500);
  }
}
