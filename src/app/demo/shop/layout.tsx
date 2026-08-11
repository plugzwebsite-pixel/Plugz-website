import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aurora Atelier",
  // A stand-in shop must never be found by a shopper or indexed as if real.
  robots: { index: false, follow: false },
};

/**
 * The stand-in for a brand's own website.
 *
 * Deliberately styled nothing like Pluggz — light, plain, its own typography —
 * because the point of the walkthrough is that the shopper has *left* us. The
 * banner is not decoration: anyone landing here has to know within a second
 * that this is a demonstration and not a shop that will take their money.
 */
export default function DemoShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#1c1917]">
      <p className="bg-[#1c1917] px-4 py-2 text-center text-xs font-medium tracking-wide text-[#faf8f5]">
        DEMONSTRATION ONLY · This stands in for a brand&apos;s own website. Nothing
        is for sale and no payment is taken.
      </p>

      <header className="border-b border-[#e7e2da]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <span className="text-lg font-semibold tracking-[0.2em]">
            AURORA ATELIER
          </span>
          <nav className="hidden gap-7 text-sm text-[#6b6660] sm:flex">
            <span>New in</span>
            <span>Dresses</span>
            <span>Knitwear</span>
            <span>Sale</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>

      <footer className="mt-16 border-t border-[#e7e2da] py-8 text-center text-xs text-[#9c9289]">
        Aurora Atelier is a fictional shop built to demonstrate how Pluggz
        tracks a sale.
      </footer>
    </div>
  );
}
