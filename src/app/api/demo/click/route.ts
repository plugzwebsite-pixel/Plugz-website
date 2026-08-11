import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";

/**
 * Follows a real tracking link and reports where it landed.
 *
 * The walkthrough can't read the redirect itself — the browser follows it
 * straight out to the brand — so this makes the same request server-side and
 * hands back the reference that was attached, which is what the brand's page
 * would see in its own URL.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) return fail("No link code.", 400);

  const link = await db.trackingLink.findUnique({ where: { code }, select: { id: true } });
  if (!link) return fail("No such link.", 404);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const res = await fetch(`${origin}/go/${code}`, {
    redirect: "manual",
    // A plain fetch reads as a bot and would be excluded from the counts, which
    // is correct behaviour but useless for a demonstration.
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
  });

  const destination = res.headers.get("location");
  if (!destination) return fail("The link did not redirect.", 502);

  const pz = new URL(destination).searchParams.get("pz");
  if (!pz) return fail("No reference was attached.", 502);

  return ok({ pz, destination });
}
