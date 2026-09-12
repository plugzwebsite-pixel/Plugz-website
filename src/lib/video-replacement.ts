import "server-only";
import type { VideoReview } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Stage a replacement only if the live and pending uids are still exactly the
 * ones the caller read. This makes simultaneous creator/admin replacements,
 * and a READY webhook racing the POST, fail closed instead of deleting or
 * superseding the wrong asset.
 */
export async function stagePendingVideo(input: {
  id: string;
  expectedUid: string;
  expectedPendingUid: string | null;
  pendingUid: string;
  pendingReview: VideoReview;
  reviewedAt?: Date;
  reviewedById?: string;
}) {
  const result = await db.creatorVideo.updateMany({
    where: {
      id: input.id,
      uid: input.expectedUid,
      pendingUid: input.expectedPendingUid,
    },
    data: {
      pendingUid: input.pendingUid,
      pendingReview: input.pendingReview,
      reviewedAt: input.reviewedAt,
      reviewedById: input.reviewedById,
    },
  });
  return result.count === 1;
}

/**
 * Clear one exact pending upload. The uid is part of the write condition so a
 * stale poll or failed upload cannot clear a newer replacement that won the
 * race after it read the row.
 */
export async function clearPendingVideo(id: string, pendingUid: string) {
  const result = await db.creatorVideo.updateMany({
    where: { id, pendingUid },
    data: { pendingUid: null, pendingReview: null },
  });
  return result.count === 1;
}

/** Promote one exact replacement, and no newer one, to the live uid. */
export async function promotePendingVideo(input: {
  id: string;
  pendingUid: string;
  review: VideoReview;
  durationSeconds: number | null;
  thumbnailUrl: string;
}) {
  const result = await db.creatorVideo.updateMany({
    where: { id: input.id, pendingUid: input.pendingUid },
    data: {
      uid: input.pendingUid,
      pendingUid: null,
      pendingReview: null,
      state: "READY",
      review: input.review,
      removedReason: null,
      readyAt: new Date(),
      durationSeconds: input.durationSeconds,
      thumbnailUrl: input.thumbnailUrl,
      reviewedAt: input.review === "PENDING" ? null : undefined,
      reviewedById: input.review === "PENDING" ? null : undefined,
    },
  });
  return result.count === 1;
}

/** Cancel either an exact replacement or an exact not-yet-live first upload. */
export async function cancelVideoUpload(id: string, uid: string) {
  const replacement = await db.creatorVideo.updateMany({
    where: { id, pendingUid: uid },
    data: { pendingUid: null, pendingReview: null },
  });
  if (replacement.count === 1) return { cancelled: true, originalPreserved: true };

  const initial = await db.creatorVideo.deleteMany({
    where: {
      id,
      uid,
      pendingUid: null,
      state: { in: ["UPLOADING", "PROCESSING"] },
    },
  });
  if (initial.count === 1) return { cancelled: true, originalPreserved: false };

  return { cancelled: false, originalPreserved: false };
}
