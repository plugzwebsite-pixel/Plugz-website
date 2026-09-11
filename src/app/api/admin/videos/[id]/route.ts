import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { deleteVideo, getVideo, thumbnailUrl, MAX_VIDEO_SECONDS } from "@/lib/stream";
import { revalidateListing } from "@/lib/revalidate";

/**
 * Moderating a creator's video.
 *
 * Moderation happens after publication, which was settled with Lisa on 27 July:
 * a clip is live the moment Cloudflare says it is playable, and a person looks
 * at it afterwards. Holding every upload in a queue until somebody is at a desk
 * would make the storefront useless to a creator posting on a Friday night, and
 * the volume that would need reviewing before launch is nil anyway.
 *
 * Approving records that somebody looked, which is the point: without it the
 * queue cannot tell an unreviewed clip from one that was reviewed and kept.
 * Removing takes it down here and deletes it at Cloudflare, because a clip
 * removed for its content should not remain fetchable by anyone who kept the
 * address.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("remove"),
    reason: z.string().trim().min(3, "Say why, so the creator can be told").max(300),
  }),
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "admin-video-poll"), 120, 60_000);
  if (!limit.ok) return fail("Slow down and retry.", 429);
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const { id } = await params;
  const row = await db.creatorVideo.findUnique({
    where: { id },
    select: {
      id: true,
      uid: true,
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
  if (!row) return fail("No such video.", 404);
  if (row.state === "READY" || row.state === "FAILED") return ok(row);

  const remote = await getVideo(row.uid);
  if (!remote) return ok(row);
  const state = remote.readyToStream
    ? "READY"
    : remote.status?.state === "error"
      ? "FAILED"
      : "PROCESSING";
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
  revalidateListing({
    handle: row.creatorProduct.profile.handle,
    slug: row.creatorProduct.slug,
  });
  return ok({ ...updated, maxSeconds: MAX_VIDEO_SECONDS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await rateLimit(clientKey(req, "video-review"), 60, 60_000);
  if (!limit.ok) return fail("Slow down and retry.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const row = await db.creatorVideo.findUnique({
    where: { id },
    select: {
      id: true,
      uid: true,
      review: true,
      creatorProduct: {
        select: { slug: true, profile: { select: { handle: true } } },
      },
    },
  });
  if (!row) return fail("No such video.", 404);

  if (parsed.data.action === "approve") {
    const updated = await db.creatorVideo.update({
      where: { id: row.id },
      data: {
        review: "APPROVED",
        removedReason: null,
        reviewedAt: new Date(),
        reviewedById: admin.user.id,
      },
      select: { id: true, review: true, reviewedAt: true },
    });
    revalidateListing({
      handle: row.creatorProduct.profile.handle,
      slug: row.creatorProduct.slug,
    });
    return ok(updated);
  }

  const updated = await db.creatorVideo.update({
    where: { id: row.id },
    data: {
      review: "REMOVED",
      removedReason: parsed.data.reason,
      reviewedAt: new Date(),
      reviewedById: admin.user.id,
    },
    select: { id: true, review: true, removedReason: true, reviewedAt: true },
  });

  // The record of the takedown stays; only the file goes.
  void deleteVideo(row.uid);
  revalidateListing({
    handle: row.creatorProduct.profile.handle,
    slug: row.creatorProduct.slug,
  });

  return ok(updated);
}
