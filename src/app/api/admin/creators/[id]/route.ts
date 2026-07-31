import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";
import type { CreatorStatus } from "@prisma/client";

const schema = z.object({
  action: z.enum(["approve", "decline", "suspend", "reinstate"]),
});

const nextStatus: Record<string, CreatorStatus> = {
  approve: "APPROVED",
  decline: "DECLINED",
  suspend: "SUSPENDED",
  reinstate: "APPROVED",
};

export async function PATCH(
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
  if (!parsed.success) return fail("Invalid action", 400);

  const profile = await db.creatorProfile.findUnique({ where: { id } });
  if (!profile) return fail("Creator not found", 404);

  const updated = await db.creatorProfile.update({
    where: { id },
    data: { status: nextStatus[parsed.data.action] },
    select: { id: true, status: true },
  });

  return ok(updated);
}
