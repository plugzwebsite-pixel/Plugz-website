import "server-only";
import { db } from "@/lib/db";
import { getSession, homeForRole, type SessionUser } from "./session";

/**
 * Authoritative access check for the signed-in areas.
 *
 * The middleware can only read the JWT, which is issued for seven days and so
 * goes stale the moment an admin declines or suspends someone. This runs in the
 * Node runtime with database access, so it re-reads live state on every
 * request, which is also what makes suspension take effect immediately instead
 * of whenever the cookie happens to expire.
 */

export type CreatorAccess =
  | { ok: true; user: SessionUser; profileId: string }
  | { ok: false; redirectTo: string };

export async function checkCreatorAccess(): Promise<CreatorAccess> {
  const user = await getSession();
  if (!user) return { ok: false, redirectTo: "/login?next=/creator/dashboard" };

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      emailVerified: true,
      creatorProfile: {
        select: {
          id: true,
          status: true,
          source: true,
          profileReleasedAt: true,
        },
      },
    },
  });

  // Session references a user that no longer exists.
  if (!account) return { ok: false, redirectTo: "/login" };

  // Admins can look at the creator area; they have no profile of their own.
  if (account.role === "ADMIN") {
    return { ok: true, user, profileId: "" };
  }
  if (account.role !== "CREATOR" || !account.creatorProfile) {
    return { ok: false, redirectTo: "/" };
  }

  const profile = account.creatorProfile;

  if (profile.status !== "APPROVED") {
    // Pending, declined and suspended all land on the status page, which
    // explains where the application actually stands.
    return { ok: false, redirectTo: "/creator/status" };
  }

  // Dual consent: a creator an admin added on their behalf has to log in and
  // release their own profile before they get the dashboard or go public.
  if (profile.source === "ADMIN_ADDED" && !profile.profileReleasedAt) {
    return { ok: false, redirectTo: "/creator/release" };
  }

  if (!account.emailVerified) {
    return { ok: false, redirectTo: "/creator/status" };
  }

  return { ok: true, user, profileId: profile.id };
}

export type BrandAccess =
  | { ok: true; user: SessionUser; brandId: string; brandName: string }
  | { ok: false; redirectTo: string };

/**
 * Access to the brand dashboard.
 *
 * The brand id comes from the database record for the signed-in user, never
 * from the URL or the request body. Everything the dashboard shows is then
 * filtered by that id, which is the only thing stopping one brand reading
 * another's sales figures.
 */
export async function checkBrandAccess(): Promise<BrandAccess> {
  const user = await getSession();
  if (!user) return { ok: false, redirectTo: "/login?next=/brand/dashboard" };

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      emailVerified: true,
      brand: { select: { id: true, name: true, status: true } },
    },
  });

  if (!account) return { ok: false, redirectTo: "/login" };

  // An admin looking at the brand area has no brand of their own.
  if (account.role === "ADMIN") return { ok: false, redirectTo: "/admin/analytics" };
  if (account.role !== "BRAND" || !account.brand) {
    return { ok: false, redirectTo: "/" };
  }
  if (account.brand.status === "PAUSED") {
    return { ok: false, redirectTo: "/brand/status" };
  }

  return {
    ok: true,
    user,
    brandId: account.brand.id,
    brandName: account.brand.name,
  };
}

export type ShopperAccount = NonNullable<
  Awaited<ReturnType<typeof loadShopper>>
>;

async function loadShopper(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      shopperProfile: {
        select: {
          id: true,
          city: true,
          interests: true,
          marketingOptIn: true,
          marketingOptInAt: true,
          termsVersion: true,
          termsAcceptedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export type ShopperAccess =
  | { ok: true; account: ShopperAccount }
  | { ok: false; redirectTo: string };

/**
 * Access to the shopper account area.
 *
 * Nothing here is gated on email verification. A shopper's account holds their
 * own details and their mailing preference and nothing else of value, so
 * locking them out of it until they click a link would only strand people who
 * want to correct an address or opt out, the two things that must always stay
 * reachable.
 */
export async function checkShopperAccess(): Promise<ShopperAccess> {
  const user = await getSession();
  if (!user) return { ok: false, redirectTo: "/login?next=/account" };

  const account = await loadShopper(user.id);
  if (!account) return { ok: false, redirectTo: "/login" };

  // Creators, brands and admins all have their own area; send them to it
  // rather than showing an empty shopper page.
  if (account.role !== "SHOPPER" || !account.shopperProfile) {
    return { ok: false, redirectTo: homeForRole(account.role) };
  }

  return { ok: true, account };
}

export async function requireAdmin(): Promise<
  { ok: true; user: SessionUser } | { ok: false; redirectTo: string }
> {
  const user = await getSession();
  if (!user) return { ok: false, redirectTo: "/login?next=/admin/approvals" };

  // Re-read the role rather than trusting the token. An admin demoted since
  // sign-in must lose access straight away.
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!account) return { ok: false, redirectTo: "/login" };
  if (account.role !== "ADMIN") return { ok: false, redirectTo: "/" };

  return { ok: true, user };
}

/** Everything the status page needs to explain where someone stands. */
export async function getCreatorState() {
  const user = await getSession();
  if (!user) return null;

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      creatorProfile: {
        select: {
          id: true,
          handle: true,
          status: true,
          source: true,
          profileReleasedAt: true,
          termsVersion: true,
          termsAcceptedAt: true,
        },
      },
    },
  });
  return account;
}
