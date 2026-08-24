import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { streamConfigured } from "@/lib/stream";
import { VideoQueue, type QueueVideo } from "@/components/admin/video-queue";

export const metadata: Metadata = { title: "Creator videos" };
export const dynamic = "force-dynamic";

/**
 * Reviewing creator video, after it has published.
 *
 * Settled with Lisa on 27 July: a clip goes live as soon as it is playable and
 * is looked at afterwards. So this is not a gate, it is a queue, and the
 * difference matters. Nothing here is waiting on an administrator to be seen by
 * shoppers; what is waiting is somebody confirming it should stay.
 */
export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const show = (await searchParams).show ?? "pending";

  const where =
    show === "removed" ? { review: "REMOVED" as const }
    : show === "approved" ? { review: "APPROVED" as const }
    : { review: "PENDING" as const };

  const [rows, counts] = await Promise.all([
    db.creatorVideo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        uid: true,
        state: true,
        review: true,
        durationSeconds: true,
        thumbnailUrl: true,
        removedReason: true,
        reviewedAt: true,
        createdAt: true,
        reviewedBy: { select: { name: true } },
        creatorProduct: {
          select: {
            slug: true,
            profile: { select: { handle: true, user: { select: { name: true } } } },
            product: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
      },
    }),
    db.creatorVideo.groupBy({ by: ["review"], _count: true }),
  ]);

  const count = (r: string) => counts.find((c) => c.review === r)?._count ?? 0;

  const queue: QueueVideo[] = rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    state: r.state,
    review: r.review,
    durationSeconds: r.durationSeconds,
    thumbnailUrl: r.thumbnailUrl,
    removedReason: r.removedReason,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewedBy: r.reviewedBy?.name ?? null,
    uploadedAt: r.createdAt.toISOString(),
    creator: r.creatorProduct.profile.user.name,
    handle: r.creatorProduct.profile.handle,
    product: r.creatorProduct.product.name,
    brand: r.creatorProduct.product.brand.name,
    href: `/@${r.creatorProduct.profile.handle}/${r.creatorProduct.slug}`,
  }));

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-text-muted">
          Clips creators have added to their product pages. A video is live from
          the moment it finishes processing, so this is a review queue rather
          than an approval gate. Removing one takes it down everywhere and
          deletes the file.
        </p>
        {!streamConfigured() && (
          <p className="mt-3 rounded-sm border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-300">
            Video hosting is not configured, so creators cannot upload yet.
          </p>
        )}
      </div>

      <VideoQueue
        videos={queue}
        show={show}
        counts={{
          pending: count("PENDING"),
          approved: count("APPROVED"),
          removed: count("REMOVED"),
        }}
      />
    </div>
  );
}
