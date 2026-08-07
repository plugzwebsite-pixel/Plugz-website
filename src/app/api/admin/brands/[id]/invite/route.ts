import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendBrandInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.email({ message: "Enter a valid email address" }),
});

/**
 * Give a brand contact access to their own dashboard.
 *
 * The account is created against one brand and can only ever read that brand's
 * figures. It is deliberately read-only: per the requirements, brands don't
 * self-manage campaigns, commission rates or creator contact — those stay with
 * Lisa and Rachel.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Check the name and email.", 422);
  }

  const brand = await db.brand.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!brand) return fail("Brand not found", 404);

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, brandId: true },
  });

  if (existing) {
    // Don't quietly convert a creator or admin account into a brand login.
    if (existing.role !== "BRAND") {
      return fail("That email already belongs to another Pluggz account.", 409, {
        email: "Already registered",
      });
    }
    if (existing.brandId && existing.brandId !== brand.id) {
      return fail("That contact already has access to a different brand.", 409, {
        email: "Linked to another brand",
      });
    }
  }

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { brandId: brand.id, name: parsed.data.name },
        select: { id: true },
      })
    : await db.user.create({
        data: {
          email,
          name: parsed.data.name,
          role: "BRAND",
          brandId: brand.id,
          // Placeholder only — they set their own via the invite link.
          passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
        },
        select: { id: true },
      });

  const { raw, hash } = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(72) },
  });
  await sendBrandInviteEmail(email, parsed.data.name, brand.name, raw);

  return ok({ invited: true, email, brand: brand.name }, 201);
}
