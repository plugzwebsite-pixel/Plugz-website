import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";
import { CREATOR_TERMS_VERSION, CREATOR_TERMS_SECTIONS } from "@/lib/creator-terms";

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
          Version {CREATOR_TERMS_VERSION}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong">
          Creator Terms &amp; Membership Agreement
        </h1>
        <div className="mt-8 space-y-6 text-[0.975rem] leading-relaxed text-text-muted">
          <p>
            Welcome to Pluggz! We&apos;re excited to work with you. These terms explain how we work together in a simple, transparent way.
          </p>
          {CREATOR_TERMS_SECTIONS.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="mb-2 text-xl font-semibold text-text-strong">{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text-strong">Website Acceptance</h2>
            <p>By ticking this box and clicking Create Account, you agree to these Terms &amp; Membership Agreement and acknowledge that this electronic acceptance has the same legal effect as a handwritten signature.</p>
            <p className="mt-4">I have read, understood and agree to the Pluggz Creator Terms &amp; Membership Agreement, including the licence granted to CEO Live Ltd and Pluggz to use my creator profile and approved content as described above.</p>
          </section>
        </div>
      </Container>
    </div>
  );
}
