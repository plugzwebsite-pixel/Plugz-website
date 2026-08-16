import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";

/**
 * Raise or update a dispute against a recorded sale.
 *
 * Nothing here moves money. A dispute is the record of a disagreement and who
 * is waiting on whom; correcting a sale is a separate, deliberate act, so
 * closing one of these can never quietly change what somebody is paid.
 */
const REASONS = [
  "RETURNED_NOT_REPORTED",
  "VALUE_WRONG",
  "NOT_OUR_SALE",
  "DUPLICATE",
  "CREATOR_QUERY",
  "OTHER",
] as const;

const STATUSES = ["OPEN", "WITH_BRAND", "RESOLVED", "WRITTEN_OFF"] as const;

const createSchema = z.object({
  saleId: z.string().min(1, "Choose a sale"),
  reason: z.enum(REASONS),
  detail: z.string().trim().min(4, "Say what is wrong").max(1000),
  raisedBy: z.string().trim().min(2, "Who raised it?").max(80),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES),
  resolution: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, createSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const sale = await db.sale.findUnique({
    where: { id: input.saleId },
    select: { id: true },
  });
  if (!sale) return fail("That sale no longer exists.", 404);

  const dispute = await db.dispute.create({
    data: {
      saleId: sale.id,
      reason: input.reason,
      detail: input.detail,
      raisedBy: input.raisedBy,
    },
  });

  return ok({ id: dispute.id }, 201);
}

export async function PATCH(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.success) return parsed.response;
  const { id, status, resolution } = parsed.data;

  const closing = status === "RESOLVED" || status === "WRITTEN_OFF";
  if (closing && !resolution?.trim()) {
    return fail("Write down what was agreed before closing this.", 422, {
      resolution: "Needed to close a dispute",
    });
  }

  const existing = await db.dispute.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return fail("That dispute no longer exists.", 404);

  await db.dispute.update({
    where: { id },
    data: {
      status,
      resolution: resolution?.trim() || null,
      // Reopening clears the date, so "resolved on" always means what it says.
      resolvedAt: closing ? new Date() : null,
    },
  });

  return ok({ id, status });
}
