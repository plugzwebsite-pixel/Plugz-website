import type { Metadata } from "next";
import { MousePointerClick, Percent, Users, ShieldCheck } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { BrandEnquiryForm } from "@/components/marketing/brand-enquiry-form";
import { getPlatformStats } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Partner with Pluggz",
  description:
    "Get your products in front of UK creators and their audiences. Commission on sales only — never on clicks or impressions.",
};

export const revalidate = 3600;

const points = [
  {
    icon: Users,
    title: "Creators who actually use it",
    body: "Your product gets a page of its own with a named creator's review, rating and photos — not a thumbnail in a feed.",
  },
  {
    icon: MousePointerClick,
    title: "Every click attributed",
    body: "Pluggz generates and tracks its own links, so you can see exactly which creator sent each shopper to your site.",
  },
  {
    icon: Percent,
    title: "Commission on sales only",
    body: "Nothing for impressions, nothing for clicks. Returns inside your own window come off automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Your own dashboard",
    body: "See shoppers sent, sales, commission and what you keep — updated as it happens.",
  },
];

export default async function BrandsPage() {
  const stats = await getPlatformStats();

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
            <Eyebrow>For brands</Eyebrow>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] text-text-strong">
              Get your products in front of the creators{" "}
              <span className="text-gradient italic">people actually trust.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              Pluggz is where UK creators share what they genuinely use. Every
              recommendation gets its own page, every click is tracked back to
              the creator who earned it, and you only pay commission when a sale
              actually completes.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <Reveal>
              <div className="space-y-7">
                {points.map((p) => (
                  <div key={p.title} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-brand-pink">
                      <p.icon size={19} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-text-strong">
                        {p.title}
                      </h2>
                      <p className="mt-1.5 leading-relaxed text-text-muted">
                        {p.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal index={1}>
              <div className="mt-10 rounded-md border border-border bg-bg-elev p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Stat value={String(stats.creators)} label="UK creators" />
                  <Stat value={String(stats.listings)} label="products plugged" />
                  <Stat value={String(stats.brands)} label="brands onboard" />
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal index={1}>
            <div id="enquiry">
              <h2 className="font-display text-2xl font-semibold text-text-strong">
                Tell us about your brand
              </h2>
              <p className="mt-2 text-text-muted">
                One question decides how we set you up — the rest takes a minute.
              </p>
              <div className="mt-5">
                <BrandEnquiryForm />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-gradient">{value}</div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}
