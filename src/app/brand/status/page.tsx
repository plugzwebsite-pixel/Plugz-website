import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PauseCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/marketing/aurora";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account paused" };

export default async function BrandStatusPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { brand: { select: { name: true, status: true } } },
  });
  if (!account?.brand) redirect("/");
  if (account.brand.status !== "PAUSED") redirect("/brand/dashboard");

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Aurora intensity="soft" className="opacity-60" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <Container className="relative z-10 flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-8 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <PauseCircle size={30} className="text-accent-gold" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-text-strong">
            {account.brand.name} is paused
          </h1>
          <p className="mt-4 leading-relaxed text-text-muted">
            Your partnership with Pluggz is on hold, so the dashboard isn&apos;t
            showing figures at the moment. Any sales already recorded are safe
            and still settle as normal. Get in touch with the Pluggz team and
            we&apos;ll pick it back up.
          </p>
          <Link href="/" className="mt-8 inline-block">
            <Button variant="secondary">Browse Pluggz</Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
