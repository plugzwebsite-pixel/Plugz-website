import type { Metadata } from "next";
import { StorefrontManager } from "@/components/creator/storefront-manager";

export const metadata: Metadata = { title: "Storefront links" };

export default function CreatorStorefrontPage() {
  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Paste a brand product URL and Plugz builds the product page, generates the
        affiliate tracking, and adds it to your storefront — no manual work.
      </p>
      <StorefrontManager />
    </div>
  );
}
