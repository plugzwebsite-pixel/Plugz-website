import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getVideo, deleteVideo, thumbnailUrl, MAX_VIDEO_SECONDS } from "@/lib/stream";

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

async function ownedVideo(id: string, profileId: string) {
  return db.creatorVideo.findFirst({
    where: { id, creatorProduct: { profileId } },
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

  await db.creatorVideo.delete({ where: { id: row.id } });
  // After the row, so a Cloudflare hiccup cannot leave a listing pointing at a
  // clip that is no longer there.
  void deleteVideo(row.uid);

  return ok({ removed: true });
}
