import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";

// Every link here goes somewhere real. An "About" pointing at the homepage and
// a "Sign in" shown to someone already signed in are the small things that make
// a site feel unfinished.
const columns = [
  {
    title: "Shop",
    links: [
      { label: "Women's Fashion", href: "/category/womens-fashion" },
      { label: "Beauty & Skincare", href: "/category/beauty-skincare" },
      { label: "Shoes & Accessories", href: "/category/shoes-accessories" },
      { label: "Travel / Holiday", href: "/category/travel-holiday" },
      { label: "Create an account", href: "/signup/shopper" },
    ],
  },
  {
    title: "Creators",
    links: [
      { label: "Apply to join", href: "/signup" },
      { label: "Creator dashboard", href: "/creator/dashboard" },
      { label: "Join the waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Partner with us", href: "/brands" },
      { label: "Creator Terms", href: "/legal/creator-terms" },
      { label: "Search Pluggz", href: "/search" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-elev">
      <Container size="wide" className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo size="md" />
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              The UK&apos;s curated directory of creators and the products they
              actually plug. Discover here, buy at the brand.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-semibold text-text-strong">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-muted transition-colors hover:text-brand-pink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-text-faint sm:flex-row">
          <p>© 2026 Pluggz Ltd · Discover here, buy at the brand.</p>
          <p>Made in the UK</p>
        </div>
      </Container>
    </footer>
  );
}
