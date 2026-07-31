import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Creator Terms & Membership Agreement",
};

export default function CreatorTermsPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <Container className="flex items-center justify-between py-4">
          <Logo size="sm" />
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
          >
            <ArrowLeft size={16} /> Back to application
          </Link>
        </Container>
      </header>
      <Container size="narrow" className="py-14">
        <p className="text-gradient text-xs font-bold uppercase tracking-[0.2em]">
          Version 2026-07-01
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong">
          Creator Terms &amp; Membership Agreement
        </h1>
        <div className="mt-8 space-y-6 text-[0.975rem] leading-relaxed text-text-muted">
          <p>
            This is a placeholder for the Plugz Creator Terms &amp; Membership
            Agreement. The final legal copy will be supplied by Plugz Ltd before
            launch. By ticking the acceptance box on the creator application, you
            agree to the terms in force at the time, and your acceptance is
            recorded with an automatic timestamp and the terms version shown
            above.
          </p>
          <p>
            In summary, membership grants Plugz the authority to represent your
            profile and content when approaching brands for collaborations,
            covers the commission structure (creators earn a minimum of 8% per
            sale), and sets out the twice-monthly payout schedule and returns
            policy.
          </p>
          <p className="text-sm text-text-faint">
            Nothing on this page constitutes the final agreement; it exists so the
            application flow can be demonstrated end to end.
          </p>
        </div>
      </Container>
    </div>
  );
}
