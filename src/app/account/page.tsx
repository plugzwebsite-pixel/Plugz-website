import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MailWarning, Compass } from "lucide-react";
import { db } from "@/lib/db";
import { publicBrand } from "@/lib/queries";
import { checkShopperAccess } from "@/lib/auth/access";
import { ResendVerification } from "@/components/auth/resend-verification";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Container, Badge, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { AccountForm } from "./account-form";
import { SavedItems, type SavedItem } from "@/components/account/saved-items";
import { publicCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

// Reads the session, so it can never be prerendered or cached.
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function AccountPage() {
  const access = await checkShopperAccess();
  const names = (await publicCategories()).map((c) => c.name);

  if (!access.ok) redirect(access.redirectTo);

  const { account } = access;
  const profile = account.shopperProfile!;
  const firstName = account.name.split(" ")[0];

  // Only what a shopper could still reach: a listing taken down, or one on the
  // demonstration shop, should not sit in somebody's saved items.
  const savedRows = await db.wishlistItem.findMany({
    where: {
      userId: account.id,
      creatorProduct: { live: true, product: { brand: publicBrand } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      creatorProduct: {
        select: {
          id: true,
          slug: true,
          profile: { select: { handle: true } },
          product: {
            select: {
              name: true,
              imageUrl: true,
              pricePence: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const saved: SavedItem[] = savedRows.map((w) => ({
    id: w.creatorProduct.id,
    name: w.creatorProduct.product.name,
    brand: w.creatorProduct.product.brand.name,
    pricePence: w.creatorProduct.product.pricePence,
    imageUrl: w.creatorProduct.product.imageUrl,
    href: `/@${w.creatorProduct.profile.handle}/${w.creatorProduct.slug}`,
    creatorHandle: w.creatorProduct.profile.handle,
    savedAt: w.createdAt,
  }));


  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong">
            Hello, {firstName}
          </h1>
          <p className="mt-2 text-text-muted">
            Member since {dateFormat.format(account.createdAt)}
          </p>
        </div>
        <SignOutButton variant="secondary" />
      </div>

      {!account.emailVerified && (
        <div className="mt-8 rounded-md border border-accent-cyan/25 bg-accent-cyan/[0.06] p-5">
          <div className="flex items-start gap-3">
            <MailWarning size={18} className="mt-0.5 shrink-0 text-accent-cyan" />
            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-text-strong">
                  Confirm your email
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  We sent a link to{" "}
                  <span className="font-medium text-text">{account.email}</span>.
                  Confirming it is what lets us reach you, and nothing on your
                  account is locked until you do.
                </p>
              </div>
              <ResendVerification email={account.email} />
            </div>
          </div>
        </div>
      )}

      <section className="mt-8 rounded-md border border-border bg-surface p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-text-strong">
            Your details
          </h2>
          {account.emailVerified ? (
            <Badge tone="green">
              <CheckCircle2 size={12} /> Email confirmed
            </Badge>
          ) : (
            <Badge tone="amber">Email unconfirmed</Badge>
          )}
        </div>

        <div className="mt-5 rounded-sm border border-border bg-surface-2/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-faint">
            Email address
          </p>
          <p className="mt-1 text-[0.95rem] text-text-strong">{account.email}</p>
          <p className="mt-1.5 text-sm text-text-faint">
            Your sign-in address. Email{" "}
            <a
              href="mailto:hello@pluggzofficial.co.uk"
              className="text-brand-pink hover:underline"
            >
              hello@pluggzofficial.co.uk
            </a>{" "}
            to change it.
          </p>
        </div>

        <div className="mt-6">
          <AccountForm
            categories={names}
            defaults={{
              name: account.name,
              city: profile.city ?? "",
              interests: profile.interests,
              marketing: profile.marketingOptIn,
            }}
          />
        </div>
      </section>

      <SavedItems items={saved} />

      <section className="mt-6 rounded-md border border-border bg-surface p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <Compass size={18} className="mt-0.5 shrink-0 text-brand-pink" />
          <div>
            <h2 className="font-display text-xl font-semibold text-text-strong">
              Start browsing
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
              There is no checkout on Pluggz. You discover here and buy at the
              brand, at the brand&apos;s own price.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href="/">
                <Button size="sm">Featured creators</Button>
              </Link>
              <Link href="/search">
                <Button size="sm" variant="secondary">
                  Search Pluggz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-sm text-text-faint">
        Want to earn commission on what you recommend?{" "}
        <Link href="/signup" className="text-text-muted hover:text-brand-pink">
          Apply as a creator
        </Link>
      </p>
    </Container>
  );
}
