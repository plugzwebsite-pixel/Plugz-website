import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";
import {
  POLICY_CONTACT_EMAIL,
  POLICY_EFFECTIVE_DATE,
  type PolicySection,
} from "@/lib/policies";

/** Shared layout for the Privacy Policy and Cookie Policy. */
export function PolicyPage({
  title,
  sections,
  related,
}: {
  title: string;
  sections: PolicySection[];
  related: { label: string; href: string };
}) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <Container className="flex items-center justify-between py-4">
          <Logo size="sm" />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-text-muted hover:text-text-strong"
          >
            <ArrowLeft size={16} /> Back to Pluggz
          </Link>
        </Container>
      </header>
      <Container size="narrow" className="py-14">
        <p className="text-gradient text-xs font-bold uppercase tracking-[0.2em]">
          Effective {POLICY_EFFECTIVE_DATE}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong">
          {title}
        </h1>
        <div className="mt-8 space-y-8 text-[0.975rem] leading-relaxed text-text-muted">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-semibold text-text-strong">
                {section.heading}
              </h2>
              <div className="space-y-3">
                {section.blocks.map((block, i) => {
                  if (typeof block === "string") return <p key={i}>{block}</p>;
                  if ("subheading" in block) {
                    return (
                      <h3 key={i} className="pt-3 font-semibold text-text-strong">
                        {block.subheading}
                      </h3>
                    );
                  }
                  return (
                    <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-pink">
                      {block.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                })}
              </div>
            </section>
          ))}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-text-strong">Contact</h2>
            <p>
              CEO Live Ltd
              <br />
              Email:{" "}
              <a
                href={`mailto:${POLICY_CONTACT_EMAIL}`}
                className="text-text-strong underline underline-offset-4 hover:text-brand-pink"
              >
                {POLICY_CONTACT_EMAIL}
              </a>
            </p>
          </section>
          <p className="border-t border-border pt-6 text-sm">
            See also our{" "}
            <Link href={related.href} className="text-text-strong underline underline-offset-4 hover:text-brand-pink">
              {related.label}
            </Link>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}
