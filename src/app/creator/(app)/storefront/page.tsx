import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { StorefrontManager } from "@/components/creator/storefront-manager";

export const metadata: Metadata = { title: "Storefront links" };

export default async function CreatorStorefrontPage() {
  const user = await getSession();

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Paste a brand product URL and Pluggz builds the product page, generates the
        affiliate tracking, and adds it to your storefront — no manual work.
      </p>
      <StorefrontManager handle={user?.handle ?? ""} />
    </div>
  );
}
