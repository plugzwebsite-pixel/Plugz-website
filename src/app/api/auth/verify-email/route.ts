import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { hashToken } from "@/lib/auth/tokens";
import { z } from "zod";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid or missing token.", 400);

  const tokenHash = hashToken(parsed.data.token);
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, emailVerified: true } } },
  });

  if (!record) return fail("This verification link is invalid.", 400);
  if (record.expiresAt < new Date()) {
    await db.emailVerificationToken.delete({ where: { id: record.id } });
    return fail("This verification link has expired. Request a new one.", 410);
  }

  if (!record.user.emailVerified) {
    await db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    });
  }
  // One-time use — consume all outstanding tokens for this user.
  await db.emailVerificationToken.deleteMany({
    where: { userId: record.userId },
  });

  return ok({ verified: true });
}
