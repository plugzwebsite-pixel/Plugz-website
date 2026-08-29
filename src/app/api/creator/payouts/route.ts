import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { publicOrigin } from "@/lib/url";
import {
  stripeConfigured,
  ensureConnectedAccount,
  onboardingLink,
  accountDashboardLink,
  accountState,
  StripeNotReady,
} from "@/lib/stripe";

/**
 * A creator setting themselves up to be paid.
 *
 * Nothing about a bank account passes through here. This makes their account at
 * Stripe if they have not got one, then hands back a link to Stripe's own
 * onboarding, where they enter their details on Stripe's pages. We are told
 * only whether Stripe will pay them yet, and what it is still waiting for.
 *
 * POST starts or continues onboarding. GET refreshes what Stripe thinks, which
 * is what the page calls when a creator comes back from finishing it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = await rateLimit(clientKey(req, "creator-payouts"), 30, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);
  if (!stripeConfigured()) return ok({ configured: false });

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: { stripeAccountId: true, stripePayoutsEnabled: true, stripeRequirement: true },
  });
  if (!profile?.stripeAccountId) {
    return ok({ configured: true, started: false, payoutsEnabled: false });
  }

  // Asked of Stripe rather than read from our own copy, because this is called
  // the moment a creator returns from onboarding and our copy is exactly what
  // is out of date at that moment.
  try {
    const state = await accountState(profile.stripeAccountId);
    await db.creatorProfile.update({
      where: { id: access.profileId },
      data: {
        stripePayoutsEnabled: state.payoutsEnabled,
        stripeRequirement: state.requirement,
        ...(state.payoutsEnabled && !profile.stripePayoutsEnabled
          ? { stripeOnboardedAt: new Date() }
          : {}),
      },
    });
    return ok({
      configured: true,
      started: true,
      payoutsEnabled: state.payoutsEnabled,
      requirement: state.requirement,
    });
  } catch (err) {
    console.error("[creator/payouts] could not read the account:", err);
    // Their stored state is the honest fallback: stale, but never invented.
    return ok({
      configured: true,
      started: true,
      payoutsEnabled: profile.stripePayoutsEnabled,
      requirement: profile.stripeRequirement,
      stale: true,
    });
  }
}

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "creator-payouts-start"), 10, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const access = await checkCreatorAccess();
  if (!access.ok) return fail("Creators only.", 403);
  if (!stripeConfigured()) {
    return fail("Payouts are not switched on yet. We will let you know.", 503);
  }

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: {
      stripeAccountId: true,
      stripePayoutsEnabled: true,
      handle: true,
      user: { select: { email: true } },
    },
  });
  if (!profile) return fail("Creators only.", 403);

  try {
    // Already able to receive money: send them to manage the account rather
    // than through onboarding they have finished.
    if (profile.stripeAccountId && profile.stripePayoutsEnabled) {
      return ok({ url: await accountDashboardLink(profile.stripeAccountId), kind: "manage" });
    }

    const accountId = await ensureConnectedAccount({
      existingId: profile.stripeAccountId,
      email: profile.user.email,
      handle: profile.handle,
    });

    if (accountId !== profile.stripeAccountId) {
      await db.creatorProfile.update({
        where: { id: access.profileId },
        data: { stripeAccountId: accountId },
      });
    }

    const url = await onboardingLink(accountId, publicOrigin(req));
    return ok({ url, kind: "onboard" });
  } catch (err) {
    if (err instanceof StripeNotReady) return fail(err.message, 503);
    console.error("[creator/payouts] Stripe refused:", err);
    return fail("Couldn't start that just now. Please try again shortly.", 503);
  }
}
