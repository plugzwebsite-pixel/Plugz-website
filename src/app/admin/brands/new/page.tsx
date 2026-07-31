import type { Metadata } from "next";
import { BrandOnboardingForm } from "@/components/admin/brand-onboarding-form";

export const metadata: Metadata = { title: "Add brand" };

export default function AddBrandPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-text-muted">
        Onboard a new brand. The first question decides the rest of the flow: is
        the brand already running an affiliate programme, or is this a direct deal?
      </p>
      <BrandOnboardingForm />
    </div>
  );
}
