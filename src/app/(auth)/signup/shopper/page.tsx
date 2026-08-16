import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ShopperSignupForm } from "./shopper-signup-form";
import { publicCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a free Pluggz account to follow the creators you like and hear about new drops first.",
};

/**
 * Shopper registration, kept separate from /signup.
 *
 * /signup is the creator application: it is reviewed by hand, asks for
 * follower counts and lands on a pending screen. Putting a shopper through
 * that form would be wrong in every particular, so the two flows stay apart
 * and cross-link instead.
 */
export default async function ShopperSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // Set when the link came off a creator's storefront, so the team can see
  // which creators actually bring shoppers in.
  const { from } = await searchParams;
  const names = (await publicCategories()).map((c) => c.name);

  return (
    <AuthShell
      audience="shopper"
      eyebrow="Shop with Pluggz"
      title="Create your account"
      subtitle="Free, takes a minute. Follow the creators you like and be first to hear what they're plugging."
    >
      <ShopperSignupForm source={from} categories={names} />

      <p className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-pink hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-text-faint">
        Are you a creator?{" "}
        <Link href="/signup" className="text-text-muted hover:text-brand-pink">
          Apply to join instead
        </Link>
      </p>
    </AuthShell>
  );
}
