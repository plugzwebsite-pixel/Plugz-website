import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/access";
import { fail, ok, parseBody } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createDirectUpload, deleteVideo, streamConfigured, StreamError } from "@/lib/stream";
import { stagePendingVideo } from "@/lib/video-replacement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ listingId: z.string().trim().min(1) });

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "admin-video-upload"), 30, 60_000);
  if (!limit.ok) return fail("Too many uploads. Try again shortly.", 429);
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);
  if (!streamConfigured()) return fail("Video uploads are not configured.", 503);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const listing = await db.creatorProduct.findUnique({
    where: { id: parsed.data.listingId },
    select: {
      id: true,
      slug: true,
      profile: { select: { handle: true } },
      video: {
        select: {
          id: true,
          uid: true,
          pendingUid: true,
          pendingReview: true,
          state: true,
          review: true,
          durationSeconds: true,
          thumbnailUrl: true,
          removedReason: true,
        },
      },
    },
  });
  if (!listing) return fail("That listing no longer exists.", 404);

  let upload;
  try {
    upload = await createDirectUpload({ creatorHandle: listing.profile.handle, listingId: listing.id });
  } catch (error) {
    const message = error instanceof StreamError && error.isQuota
      ? "Video storage is full. Increase the Stream allowance and try again."
      : "Couldn't start that upload.";
    return fail(message, 503);
  }

  try {
    if (listing.video) {
      const stalePending = listing.video.pendingUid;
      const staged = await stagePendingVideo({
        id: listing.video.id,
        expectedUid: listing.video.uid,
        expectedPendingUid: stalePending,
        pendingUid: upload.uid,
        pendingReview: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.user.id,
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
      data: {
        creatorProductId: listing.id,
        uid: upload.uid,
        review: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.user.id,
      },
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
      pendingReview: null,
      replacementState: null,
      replacing: false,
      uploadUid: upload.uid,
      uploadUrl: upload.uploadUrl,
    }, 201);
  } catch (error) {
    void deleteVideo(upload.uid);
    console.error("[admin/videos] couldn't record direct upload:", error);
    return fail("Couldn't start that upload.", 500);
  }
}
