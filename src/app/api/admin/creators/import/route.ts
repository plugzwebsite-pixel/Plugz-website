import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendCreatorInviteEmail } from "@/lib/email";
import { profileUrl, CATEGORIES } from "@/lib/validation";
import { parseCsv, toRecords, field, parseFollowers, parseHandle } from "@/lib/csv";
import { randomBytes } from "crypto";
import { z } from "zod";

/**
 * Where a creator's photo lives.
 *
 * Rachel's sheet may carry a full URL, a bare filename for images dropped onto
 * the server, or nothing at all — in which case we look for a file named after
 * the handle. Anything unusable returns null and the avatar falls back to
 * initials rather than rendering a broken image.
 */
function resolveAvatar(raw: string, handle: string): string | null {
  const value = raw.trim();
  if (value) {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/")) return value;
    // Strip any path a spreadsheet carried over, Windows or otherwise.
    const file = value.replace(/^.*[\\/]/, "");
    if (/\.(jpe?g|png|webp|avif)$/i.test(file)) return `/images/creators/${file}`;
    return null;
  }
  return `/images/creators/${handle}.jpg`;
}

const TERMS_VERSION = "2026-07-01";
const MAX_ROWS = 500;

const bodySchema = z.object({
  csv: z.string().min(1, "Paste or upload a CSV"),
  commit: z.boolean().default(false),
});

type RowResult = {
  line: number;
  name: string;
  email: string;
  handle: string;
  category: string;
  city: string;
  followers: { instagram: number; tiktok: number; youtube: number };
  avatarUrl: string | null;
  status: "ready" | "skipped" | "error";
  reason?: string;
};

/**
 * Bulk-add creators from a spreadsheet export.
 *
 * Runs as a dry run by default: Rachel sees exactly what would be created,
 * which rows are duplicates and which are malformed, before anything is
 * written and before thirty invite emails go out. Only `commit: true` writes.
 *
 * Every creator created here goes down the same dual-consent path as the
 * single-add form — approved by the admin, but invisible and locked out of the
 * dashboard until the creator logs in and releases their own profile.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return fail("You don't have access to this.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Paste a CSV to import.", 422);

  const records = toRecords(parseCsv(parsed.data.csv));
  if (records.length === 0) {
    return fail("No rows found. Check the file has a header row.", 422);
  }
  if (records.length > MAX_ROWS) {
    return fail(`That's ${records.length} rows — import up to ${MAX_ROWS} at a time.`, 422);
  }

  // Existing rows, fetched once rather than per row.
  const emails = new Set(
    (await db.user.findMany({ select: { email: true } })).map((u) => u.email)
  );
  const handles = new Set(
    (await db.creatorProfile.findMany({ select: { handle: true } })).map((p) => p.handle)
  );

  const results: RowResult[] = [];
  const seenInFile = { emails: new Set<string>(), handles: new Set<string>() };

  for (const [i, rec] of records.entries()) {
    const line = i + 2; // +1 for zero-index, +1 for the header row
    const name = field(rec, "name", "creator", "fullname");
    const email = field(rec, "email", "emailaddress").toLowerCase();
    const rawHandle = field(rec, "handle", "username", "instagram", "instagramhandle");
    const handle = parseHandle(rawHandle).toLowerCase();
    const city = field(rec, "city", "location", "town");
    const rawCategory = field(rec, "category", "niche", "vertical");
    // Accepts a full URL, or a bare filename for photos dropped into
    // public/images/creators/. Falls back to <handle>.jpg so a sheet with no
    // image column still picks up files named after the creator.
    const avatarUrl = resolveAvatar(
      field(rec, "image", "photo", "avatar", "picture", "headshot"),
      handle
    );

    const followers = {
      instagram: parseFollowers(field(rec, "instagramfollowers", "igfollowers", "instagram", "followers")),
      tiktok: parseFollowers(field(rec, "tiktokfollowers", "ttfollowers", "tiktok")),
      youtube: parseFollowers(field(rec, "youtubefollowers", "ytfollowers", "youtube")),
    };

    // Match the category loosely — a sheet will say "beauty", not the exact
    // platform label.
    const category =
      CATEGORIES.find(
        (c) =>
          c.toLowerCase() === rawCategory.toLowerCase() ||
          (rawCategory && c.toLowerCase().includes(rawCategory.toLowerCase()))
      ) ?? "";

    const base = { line, name, email, handle, category, city, followers, avatarUrl };

    if (!name || !email || !handle) {
      results.push({
        ...base,
        status: "error",
        reason: !name ? "Missing name" : !email ? "Missing email" : "Missing handle",
      });
      continue;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      results.push({ ...base, status: "error", reason: "Email doesn't look valid" });
      continue;
    }
    if (!/^[a-z0-9._]{2,30}$/.test(handle)) {
      results.push({ ...base, status: "error", reason: "Handle has unsupported characters" });
      continue;
    }
    if (!category) {
      results.push({
        ...base,
        status: "error",
        reason: rawCategory ? `Unknown category "${rawCategory}"` : "Missing category",
      });
      continue;
    }
    if (emails.has(email) || seenInFile.emails.has(email)) {
      results.push({ ...base, status: "skipped", reason: "Email already on Pluggz" });
      continue;
    }
    if (handles.has(handle) || seenInFile.handles.has(handle)) {
      results.push({ ...base, status: "skipped", reason: "Handle already taken" });
      continue;
    }

    seenInFile.emails.add(email);
    seenInFile.handles.add(handle);
    results.push({ ...base, status: "ready" });
  }

  const ready = results.filter((r) => r.status === "ready");

  if (!parsed.data.commit) {
    return ok({
      dryRun: true,
      total: results.length,
      ready: ready.length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  }

  let created = 0;
  let invited = 0;
  const failures: { line: number; reason: string }[] = [];

  for (const row of ready) {
    try {
      // The creator sets their own password from the invite link; this is only
      // here so the row is never left without a hash.
      const tempHash = await hashPassword(randomBytes(24).toString("base64url"));

      const socials = (
        [
          ["instagram", row.followers.instagram],
          ["tiktok", row.followers.tiktok],
          ["youtube", row.followers.youtube],
        ] as const
      )
        .filter(([, count]) => count > 0)
        .map(([platform, count]) => ({
          platform,
          handle: row.handle,
          url: profileUrl(platform, row.handle),
          followers: count,
        }));

      const user = await db.user.create({
        data: {
          email: row.email,
          name: row.name,
          role: "CREATOR",
          passwordHash: tempHash,
          creatorProfile: {
            create: {
              handle: row.handle,
              category: row.category,
              city: row.city || null,
              avatarUrl: row.avatarUrl,
              status: "APPROVED",
              source: "ADMIN_ADDED",
              // Left null on purpose: the creator has not consented yet, so
              // the profile stays invisible until they release it themselves.
              profileReleasedAt: null,
              termsVersion: TERMS_VERSION,
              termsAcceptedAt: null,
              socials: { create: socials },
            },
          },
        },
      });
      created++;

      const { raw, hash } = generateToken();
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(72) },
      });
      await sendCreatorInviteEmail(row.email, row.name, raw);
      invited++;
    } catch (err) {
      console.error("[import] row failed:", row.email, err);
      failures.push({ line: row.line, reason: "Could not be created" });
    }
  }

  return ok({ dryRun: false, created, invited, failures });
}
