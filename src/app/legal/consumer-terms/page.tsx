import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";
import { CONSUMER_TERMS_SECTIONS, CONSUMER_TERMS_VERSION } from "@/lib/consumer-terms";

export const metadata: Metadata = { title: "Consumer Terms & Conditions" };

export default function ConsumerTermsPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <Container className="flex items-center justify-between py-4">
          <Logo size="sm" />
          <Link
            href="/signup/shopper"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
          >
            <ArrowLeft size={16} /> Back to sign up
          </Link>
        </Container>
      </header>
      <Container size="narrow" className="py-14">
        <p className="text-gradient text-xs font-bold uppercase tracking-[0.2em]">
          Version {CONSUMER_TERMS_VERSION}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong">
          Consumer Terms &amp; Conditions
        </h1>
        <div className="mt-8 space-y-7 text-[0.975rem] leading-relaxed text-text-muted">
          {CONSUMER_TERMS_SECTIONS.map(([heading, paragraphs]) => (
            <section key={heading}>
              <h2 className="mb-2 text-xl font-semibold text-text-strong">{heading}</h2>
              <div className="space-y-3">
                {paragraphs.map((body) => <p key={body}>{body}</p>)}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
