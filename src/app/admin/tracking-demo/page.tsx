import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { TrackingDemo } from "@/components/admin/tracking-demo";

export const metadata: Metadata = { title: "How tracking works" };

export default async function TrackingDemoPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        A sale, followed from a creator&apos;s link to the money landing on both
        dashboards. Everything here runs against the live system — the real link,
        the real click, the real endpoint a brand posts to, and the real
        commission engine. Only the brand&apos;s own shop is stood in for, and
        that step says so.
      </p>
      <TrackingDemo />
    </div>
  );
}
