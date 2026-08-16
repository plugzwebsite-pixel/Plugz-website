import type { Metadata } from "next";
import { AddCreatorForm } from "@/components/admin/add-creator-form";
import { publicCategories } from "@/lib/categories";

export const metadata: Metadata = { title: "Add creator" };

export default async function AddCreatorPage() {
  const names = (await publicCategories()).map((c) => c.name);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-text-muted">
        Add a creator on their behalf. They&apos;ll receive an invite to set a
        password and release their profile before it goes live (dual consent).
      </p>
      <AddCreatorForm categories={names} />
    </div>
  );
}
