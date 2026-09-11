import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/access";
import { fail, ok, parseBody } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createDirectUpload, deleteVideo, streamConfigured, StreamError } from "@/lib/stream";
import { revalidateListing } from "@/lib/revalidate";

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
      video: { select: { uid: true } },
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

  const previous = listing.video;
  const row = await db.creatorVideo.upsert({
    where: { creatorProductId: listing.id },
    create: {
      creatorProductId: listing.id,
      uid: upload.uid,
      review: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: admin.user.id,
    },
    update: {
      uid: upload.uid,
      state: "UPLOADING",
      review: "APPROVED",
      readyAt: null,
      durationSeconds: null,
      thumbnailUrl: null,
      removedReason: null,
      reviewedAt: new Date(),
      reviewedById: admin.user.id,
    },
    select: { id: true, uid: true },
  });
  if (previous && previous.uid !== upload.uid) void deleteVideo(previous.uid);
  revalidateListing({ handle: listing.profile.handle, slug: listing.slug });

  return ok({ ...row, uploadUrl: upload.uploadUrl }, 201);
}
