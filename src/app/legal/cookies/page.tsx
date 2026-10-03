import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/policy-page";
import { COOKIE_POLICY } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Pluggz uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      title="Cookie Policy"
      sections={COOKIE_POLICY}
      related={{ label: "Privacy Policy", href: "/legal/privacy" }}
    />
  );
}
