import type { Metadata } from "next";
import { ResendVerification } from "@/components/auth/resend-verification";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle, Ban, MailWarning } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/marketing/aurora";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCreatorState } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Your application" };

type State = {
  icon: typeof Clock;
  tone: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  /** Set when the blocker is an unconfirmed address, to offer a fresh link. */
  resendTo?: string;
};

export default async function CreatorStatusPage() {
  const account = await getCreatorState();
  if (!account) redirect("/login");

  const profile = account.creatorProfile;
  if (!profile) redirect("/");

  const firstName = account.name.split(" ")[0];
  let state: State;

  if (profile.status === "PENDING") {
    state = {
      icon: Clock,
      tone: "text-accent-gold",
      title: "Your application is with our team",
      body: `Thanks ${firstName}. Lisa and Rachel review every application by hand and check follower counts against your profiles, so this isn't instant. We'll email you at ${account.email} the moment there's a decision.`,
    };
  } else if (profile.status === "DECLINED") {
    state = {
      icon: XCircle,
      tone: "text-red-400",
      title: "We couldn't approve your application",
      body: "Your application wasn't successful this time. If you think this was a mistake, or your following has grown since you applied, reply to the email we sent and we'll take another look.",
    };
  } else if (profile.status === "SUSPENDED") {
    state = {
      icon: Ban,
      tone: "text-red-400",
      title: "Your account is suspended",
      body: "Access to your storefront and dashboard is paused. Contact the Pluggz team to sort this out.",
    };
  } else if (!account.emailVerified) {
    state = {
      icon: MailWarning,
      tone: "text-accent-cyan",
      title: "Confirm your email to continue",
      body: `You're approved — we just need to know ${account.email} reaches you before your storefront goes live. Check your inbox for the verification link; if it isn't there, or it has expired, send yourself a fresh one.`,
      resendTo: account.email,
    };
  } else {
    // Nothing left to block on.
    redirect("/creator/dashboard");
  }

  const Icon = state.icon;

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
            <Icon size={30} className={state.tone} />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-text-strong">
            {state.title}
          </h1>
          <p className="mt-4 leading-relaxed text-text-muted">{state.body}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {state.action && (
              <Link href={state.action.href}>
                <Button className="w-full sm:w-auto">{state.action.label}</Button>
              </Link>
            )}
            {state.resendTo && <ResendVerification email={state.resendTo} />}
            <Link href="/">
              <Button variant="secondary" className="w-full sm:w-auto">
                Browse Pluggz
              </Button>
            </Link>
          </div>

          <p className="mt-7 text-xs text-text-faint">
            Signed in as {account.email}
            {profile.handle && ` · @${profile.handle}`}
          </p>
        </div>
      </Container>
    </div>
  );
}
