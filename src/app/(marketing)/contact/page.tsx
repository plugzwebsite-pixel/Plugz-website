import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ArrowUpRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Pluggz",
  description:
    "Talk to the Pluggz team: questions, press, partnerships or help with the site. Email hello@pluggzofficial.co.uk.",
};

export const revalidate = 3600;

const CONTACT_EMAIL = "hello@pluggzofficial.co.uk";

const shortcuts = [
  {
    title: "Are you a creator?",
    body: "Applications take a couple of minutes and the team reviews every one.",
    label: "Apply to join",
    href: "/signup",
  },
  {
    title: "Are you a brand?",
    body: "See how tracking, commission and your dashboard work before you commit.",
    label: "Partner with us",
    href: "/brands",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="medium" className="opacity-70" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--hero-veil)" }}
        />
        <Container className="relative py-16 text-center">
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] text-text-strong">
              Talk to <span className="text-gradient italic">us.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              Questions, press, partnerships or a problem with the site. Send a
              message and someone from the Pluggz team will get back to you.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <Reveal>
              <div className="rounded-md border border-border bg-bg-elev p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-brand-pink">
                    <Mail size={19} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-text-strong">
                      Email us directly
                    </h2>
                    <p className="text-sm text-text-muted">
                      For anything at all, this is the fastest way in.
                    </p>
                  </div>
                </div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-5 block">
                  <Button size="lg" variant="secondary" className="w-full">
                    {CONTACT_EMAIL} <ArrowUpRight size={17} />
                  </Button>
                </a>
              </div>
            </Reveal>

            <Reveal index={1}>
              <div className="mt-8 space-y-4">
                {shortcuts.map((s) => (
                  <div
                    key={s.title}
                    className="rounded-md border border-border bg-surface p-5"
                  >
                    <h3 className="font-display text-base font-semibold text-text-strong">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">{s.body}</p>
                    <Link
                      href={s.href}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink hover:underline"
                    >
                      {s.label} <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal index={1}>
            <div>
              <h2 className="font-display text-2xl font-semibold text-text-strong">
                Or send it from here
              </h2>
              <p className="mt-2 text-text-muted">
                Fill this in and your email app takes it from there.
              </p>
              <div className="mt-5">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </>
  );
}
