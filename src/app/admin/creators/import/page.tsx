import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ImportCreators } from "@/components/admin/import-creators";

export const metadata: Metadata = { title: "Import creators" };

export default function ImportCreatorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-text-muted">
          Add a batch of creators from a spreadsheet. Each one is checked before
          anything is written, then invited to set their own password and release
          their profile — nothing about them is public until they do.
        </p>
        <Link
          href="/admin/creators/new"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-pink hover:underline"
        >
          <UserPlus size={15} /> Add one manually
        </Link>
      </div>

      <ImportCreators />
    </div>
  );
}
