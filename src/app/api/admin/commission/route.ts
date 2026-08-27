import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";
import {
  CREATOR_FLOOR,
  PLUGGZ_FLOOR,
  TOTAL_MAX,
  RATE_CEILING,
} from "@/lib/commission-limits";

/**
 * Commission rates.
 *
 * The floors are commercial, not a UI preference, so they are enforced here
 * where they cannot be bypassed by editing the page. The figures themselves
 * live in src/lib/commission-limits.ts, which the screen reads from too, so the
 * two cannot disagree about what is allowed. Do not restate them in this
 * comment: the last version named 8% and outlived it by a day.
 */

const rates = z
  .object({
    creatorRate: z.number().min(CREATOR_FLOOR, `Creator share can't go below ${CREATOR_FLOOR}%`).max(RATE_CEILING),
    pluggzRate: z.number().min(PLUGGZ_FLOOR, `Pluggz share can't go below ${PLUGGZ_FLOOR}%`).max(RATE_CEILING),
  })
  // Only the upper bound is checked here, and deliberately.
  //
  // TOTAL_MIN is the two floors added together, and zod has already enforced
  // each of those before this runs, so anything reaching this point satisfies
  // the minimum by construction. Testing for it would be a branch that can
  // never be true and an error nobody can ever be shown. TOTAL_MIN still earns
  // its place: the screen quotes the band so somebody can see what is allowed
  // before typing.
  .refine(
    (d) => d.creatorRate + d.pluggzRate <= TOTAL_MAX,
    `Total take cannot go above ${TOTAL_MAX}%`
  );

const defaultSchema = z.object({ scope: z.literal("global") }).and(rates);

const overrideSchema = z
  .object({
    scope: z.literal("override"),
    creatorProfileId: z.string().optional(),
    brandId: z.string().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .and(rates)
  .refine(
    (d) => Boolean(d.creatorProfileId) !== Boolean(d.brandId),
    "Pick either a creator or a brand, not both"
  );

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, z.union([defaultSchema, overrideSchema]));
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.scope === "global") {
    const setting = await db.platformSetting.upsert({
      where: { id: "singleton" },
      update: {
        defaultCreatorRate: input.creatorRate,
        defaultPluggzRate: input.pluggzRate,
      },
      create: {
        id: "singleton",
        defaultCreatorRate: input.creatorRate,
        defaultPluggzRate: input.pluggzRate,
      },
    });
    // Existing sales keep the rates they were written with. This only
    // affects sales recorded from now on.
    return ok({
      creatorRate: Number(setting.defaultCreatorRate),
      pluggzRate: Number(setting.defaultPluggzRate),
    });
  }

  const where = input.creatorProfileId
    ? { creatorProfileId: input.creatorProfileId }
    : { brandId: input.brandId! };

  const override = await db.commissionOverride.upsert({
    where,
    update: {
      creatorRate: input.creatorRate,
      pluggzRate: input.pluggzRate,
      note: input.note ?? null,
    },
    create: {
      ...where,
      creatorRate: input.creatorRate,
      pluggzRate: input.pluggzRate,
      note: input.note ?? null,
    },
  });

  return ok({ id: override.id });
}

export async function DELETE(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Missing id", 400);

  await db.commissionOverride.delete({ where: { id } }).catch(() => null);
  return ok({ deleted: true });
}
