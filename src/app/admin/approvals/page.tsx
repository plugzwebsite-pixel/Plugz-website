import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ApprovalQueue, type Applicant } from "@/components/admin/approval-queue";

export const metadata: Metadata = { title: "Approval queue" };

async function loadApplicants(): Promise<{ items: Applicant[]; dbError: boolean }> {
  try {
    const profiles = await db.creatorProfile.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true } },
        // Handle and url come through too: approval requires spot-checking the
        // self-reported follower counts against the actual profiles, which is
        // impossible without a link to open.
        socials: {
          select: { platform: true, handle: true, url: true, followers: true },
        },
      },
    });
    return {
      dbError: false,
      items: profiles.map((p) => ({
        id: p.id,
        name: p.user.name,
        handle: p.handle,
        city: p.city,
        category: p.category,
        status: p.status,
        featured: p.featured,
        socials: p.socials,
      })),
    };
  } catch {
    return { items: [], dbError: true };
  }
}

export default async function ApprovalsPage() {
  const { items, dbError } = await loadApplicants();

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Review new creator applications. Verify follower counts against their
        profiles before approving.
      </p>

      {dbError && (
        <div className="rounded-md border border-accent-gold/30 bg-accent-gold/[0.06] p-4 text-sm text-text-muted">
          Database not connected yet. Run{" "}
          <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text">
            scripts/setup-db.ps1
          </code>{" "}
          to load applications.
        </div>
      )}

      <ApprovalQueue initial={items} />
    </div>
  );
}
