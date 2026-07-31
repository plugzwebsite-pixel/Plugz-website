import { ok, fail } from "@/lib/http";
import { listDevMail, clearDevMail } from "@/lib/email/dev-store";

// Development-only mailbox for inspecting captured emails (verification/reset).
function guard() {
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  if (!guard()) return fail("Not available", 404);
  return ok({ mail: await listDevMail() });
}

export async function DELETE() {
  if (!guard()) return fail("Not available", 404);
  await clearDevMail();
  return ok({ cleared: true });
}
