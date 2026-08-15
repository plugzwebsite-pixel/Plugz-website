import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";

/**
 * Commission rates.
 *
 * The creator floor of 8% is contractual, not a UI preference. The schema
 * allows anything, so the floor is enforced here where it can't be bypassed by
 * editing the page. Total take is held to the 11-15% band the commercial terms
 * describe.
 */
const CREATOR_FLOOR = 8;
const PLUGGZ_FLOOR = 3;
const TOTAL_MIN = 11;
const TOTAL_MAX = 15;

const rates = z
  .object({
    creatorRate: z.number().min(CREATOR_FLOOR, `Creator share can't go below ${CREATOR_FLOOR}%`).max(30),
    pluggzRate: z.number().min(PLUGGZ_FLOOR, `Pluggz share can't go below ${PLUGGZ_FLOOR}%`).max(30),
  })
  .refine((d) => {
    const total = d.creatorRate + d.pluggzRate;
    return total >= TOTAL_MIN && total <= TOTAL_MAX;
  }, `Total take must be between ${TOTAL_MIN}% and ${TOTAL_MAX}%`);

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
