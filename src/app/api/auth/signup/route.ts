import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { creatorSignupSchema, profileUrl } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { storeAvatar } from "@/lib/avatar";

const TERMS_VERSION = "2026-07-01";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "signup"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  // The form posts multipart when a photo is attached and JSON when it isn't,
  // so that applying with a portrait is one request rather than a sign-up
  // followed by an upload the applicant has no session to make yet.
  let photo: File | null = null;
  let body: Request = req;

  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail("Invalid request body", 400);
    }
    const file = form.get("photo");
    if (file instanceof File && file.size > 0) photo = file;

    const payload = form.get("payload");
    if (typeof payload !== "string") return fail("Invalid request body", 400);
    body = new Request(req.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
  }

  const parsed = await parseBody(body, creatorSignupSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const email = input.email.toLowerCase();

  const [emailTaken, handleTaken] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.creatorProfile.findUnique({
      where: { handle: input.handle },
      select: { id: true },
    }),
  ]);
  if (emailTaken)
    return fail("An account with this email already exists.", 409, {
      email: "This email is already registered",
    });
  if (handleTaken)
    return fail("That handle is already taken.", 409, {
      handle: "This handle is already taken",
    });

  const passwordHash = await hashPassword(input.password);
  const socials = input.socials
    .filter((s) => s.handle && s.handle.trim().length > 0)
    .map((s) => {
      const handle = s.handle!.replace(/^@/, "").trim();
      return {
        platform: s.platform,
        handle,
        // Store the profile URL so the approval queue can link straight to it
        // for the manual follower check.
        url: profileUrl(s.platform, handle),
        followers: s.followers ?? 0,
      };
    });

  const user = await db.user.create({
    data: {
      email,
      name: input.name,
      role: "CREATOR",
      passwordHash,
      creatorProfile: {
        create: {
          handle: input.handle,
          // Categories are product-driven now; creators aren't pinned to one.
          category: "General",
          city: input.city || null,
          status: "PENDING",
          source: "SELF_SERVE",
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: new Date(),
          profileReleasedAt: new Date(),
          socials: { create: socials },
        },
      },
    },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });

  // Best effort: an application that succeeded must not be undone because a
  // photo was the wrong shape. They can add one from settings either way.
  if (photo) {
    const profileId = user.creatorProfile?.id;
    if (profileId) {
      const stored = await storeAvatar(photo, profileId);
      if (stored.ok) {
        await db.creatorProfile.update({
          where: { id: profileId },
          data: { avatarUrl: stored.url },
        });
      } else {
        console.warn("[signup] portrait rejected:", stored.error);
      }
    }
  }

  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendVerificationEmail(email, input.name, raw);

  return ok(
    { email, status: "PENDING" },
    201
  );
}
