import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/policy-page";
import { PRIVACY_POLICY } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pluggz collects, uses, stores and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      sections={PRIVACY_POLICY}
      related={{ label: "Cookie Policy", href: "/legal/cookies" }}
    />
  );
}
