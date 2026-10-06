import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/primitives";
import { CookieSettingsLink } from "@/components/legal/cookie-banner";

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
      { label: "Search Pluggz", href: "/search" },
    ],
  },
  {
    title: "Creators",
    links: [
      { label: "Apply to join", href: "/signup" },
      { label: "Join the waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create a shopper account", href: "/signup/shopper" },
      { label: "Creator dashboard", href: "/creator/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Partner with us", href: "/brands" },
      { label: "Creator Terms", href: "/legal/creator-terms" },
      { label: "Consumer Terms", href: "/legal/consumer-terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Cookie Policy", href: "/legal/cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-elev">
      <Container size="wide" className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
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
              <ul className="mt-3 space-y-0.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {/* Padded to a comfortable tap height on a phone. */}
                    <Link
                      href={l.href}
                      className="inline-flex min-h-10 items-center text-sm text-text-muted transition-colors hover:text-brand-pink"
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
          <p>© 2026 Pluggz, operated by CEO Live Ltd · Discover here, buy at the brand.</p>
          <div className="flex items-center gap-5">
            <CookieSettingsLink className="min-h-10 transition-colors hover:text-brand-pink" />
            <p>Made in the UK</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
