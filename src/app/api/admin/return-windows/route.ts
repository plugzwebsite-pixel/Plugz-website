import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";

/**
 * Seasonal return windows.
 *
 * A brand's normal window gates when a sale stops being Pending and becomes
 * payable. Christmas and similar stretch that window, and the commission
 * engine has always honoured an override; until now there was no way to enter
 * one. `effectiveReturnWindowDays` takes the longest window in force on the
 * day of the sale, so an override can only ever delay a payout, never bring
 * one forward, which is the safe direction.
 */
const schema = z
  .object({
    brandId: z.string().min(1, "Choose a brand"),
    label: z.string().trim().min(2, "Give it a name").max(60),
    days: z.number().int().min(1, "At least a day").max(365),
    startsAt: z.string().min(1, "Choose a start date"),
    endsAt: z.string().min(1, "Choose an end date"),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "The end date has to be after the start",
    path: ["endsAt"],
  });

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const brand = await db.brand.findUnique({
    where: { id: input.brandId },
    select: { id: true, returnWindowDays: true },
  });
  if (!brand) return fail("That brand no longer exists.", 404);

  if (input.days <= brand.returnWindowDays) {
    return fail(
      `That brand already allows ${brand.returnWindowDays} days, so a shorter window would have no effect.`,
      422,
      { days: `Longer than ${brand.returnWindowDays} days` }
    );
  }

  const override = await db.returnWindowOverride.create({
    data: {
      brandId: brand.id,
      label: input.label,
      days: input.days,
      // Dates arrive as plain days from the form. Start at the beginning of
      // the first day and run to the end of the last, so a sale on either
      // boundary is inside the window rather than a few hours outside it.
      startsAt: new Date(`${input.startsAt}T00:00:00.000Z`),
      endsAt: new Date(`${input.endsAt}T23:59:59.999Z`),
    },
  });

  return ok({ id: override.id }, 201);
}

export async function DELETE(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Which one?", 400);

  // Sales already recorded keep the window they were written with, so removing
  // this never reaches back and changes when something clears.
  await db.returnWindowOverride.deleteMany({ where: { id } });
  return ok({ removed: true });
}
