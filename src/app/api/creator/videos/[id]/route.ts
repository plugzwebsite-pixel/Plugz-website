import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getVideo, deleteVideo, thumbnailUrl, MAX_VIDEO_SECONDS } from "@/lib/stream";
import { cancelVideoUpload, clearPendingVideo, promotePendingVideo } from "@/lib/video-replacement";
import { revalidateListing } from "@/lib/revalidate";

/**
 * The state of one video, and removing it.
 *
 * Cloudflare sends a webhook when a clip finishes encoding, but a creator
 * watching their own upload wants to see it happen rather than wait for a
 * notification that may take a minute. This asks Cloudflare directly and writes
 * back what it learns, so the two paths converge on the same row and whichever
 * arrives first wins.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.literal("cancel-upload"),
  uid: z.string().trim().min(1),
});

async function ownedVideo(id: string, profileId: string) {
  return db.creatorVideo.findFirst({
    where: { id, creatorProduct: { profileId } },
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
      creatorProduct: {
        select: { slug: true, profile: { select: { handle: true } } },
      },
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "creator-video-poll"), 120, 60_000);
  if (!limit.ok) return fail("Slow down and retry.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);

  const { id } = await params;
  const row = await ownedVideo(id, access.profileId);
  if (!row) return fail("No such video.", 404);

  if (row.pendingUid) {
    const pendingUid = row.pendingUid;
    const remote = await getVideo(pendingUid);
    if (!remote) return ok({ ...row, replacementState: "UPLOADING" });

    const replacementState = remote.readyToStream
      ? "READY"
      : remote.status?.state === "error"
        ? "FAILED"
        : "PROCESSING";
    if (replacementState === "PROCESSING") {
      return ok({ ...row, replacementState });
    }

    if (replacementState === "FAILED") {
      const cleared = await clearPendingVideo(row.id, pendingUid);
      if (cleared) void deleteVideo(pendingUid);
      const current = await ownedVideo(row.id, access.profileId);
      if (!current) return fail("No such video.", 404);
      return ok({
        ...current,
        replacementState: cleared ? "FAILED" : current.pendingUid ? "UPLOADING" : null,
      });
    }

    const promoted = await promotePendingVideo({
      id: row.id,
      pendingUid,
      review: row.pendingReview ?? "APPROVED",
      durationSeconds: remote.duration ? Math.round(remote.duration) : null,
      thumbnailUrl: thumbnailUrl(pendingUid),
    });
    if (promoted) {
      if (row.uid !== pendingUid) void deleteVideo(row.uid);
      revalidateListing({
        handle: row.creatorProduct.profile.handle,
        slug: row.creatorProduct.slug,
      });
    }
    const current = await ownedVideo(row.id, access.profileId);
    if (!current) return fail("No such video.", 404);
    return ok({
      ...current,
      replacementState: current.pendingUid ? "UPLOADING" : null,
      maxSeconds: MAX_VIDEO_SECONDS,
    });
  }

  // Settled states are not worth asking Cloudflare about again.
  if (row.state === "READY" || row.state === "FAILED") {
    return ok(row);
  }

  const remote = await getVideo(row.uid);
  if (!remote) return ok(row);

  const state =
    remote.readyToStream ? "READY"
    : remote.status?.state === "error" ? "FAILED"
    : remote.status?.state === "inprogress" || remote.status?.state === "queued" ? "PROCESSING"
    : row.state;

  if (state === row.state) return ok(row);

  const updated = await db.creatorVideo.update({
    where: { id: row.id },
    data: {
      state,
      readyAt: state === "READY" ? new Date() : null,
      durationSeconds: remote.duration ? Math.round(remote.duration) : null,
      thumbnailUrl: state === "READY" ? thumbnailUrl(row.uid) : null,
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

  return ok({ ...updated, maxSeconds: MAX_VIDEO_SECONDS });
}

/** Cancel only the exact upload whose browser transfer failed. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "creator-video-cancel"), 30, 60_000);
  if (!limit.ok) return fail("Slow down and retry.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);
  const parsed = await parseBody(req, actionSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const row = await ownedVideo(id, access.profileId);
  if (!row) return fail("No such video.", 404);

  const cancelled = await cancelVideoUpload(row.id, parsed.data.uid);
  if (!cancelled.cancelled) return fail("That upload is no longer pending.", 409);
  void deleteVideo(parsed.data.uid);
  return ok(cancelled);
}

/** A creator taking their own clip down. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "creator-video-delete"), 30, 60_000);
  if (!limit.ok) return fail("Slow down and retry.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);

  const { id } = await params;
  const row = await ownedVideo(id, access.profileId);
  if (!row) return fail("No such video.", 404);

  const deleted = await db.creatorVideo.delete({
    where: { id: row.id },
    select: { uid: true, pendingUid: true },
  });
  // After the row, so a Cloudflare hiccup cannot leave a listing pointing at a
  // clip that is no longer there.
  void deleteVideo(deleted.uid);
  if (deleted.pendingUid) void deleteVideo(deleted.pendingUid);

  return ok({ removed: true });
}
