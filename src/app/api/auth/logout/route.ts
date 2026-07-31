import { ok } from "@/lib/http";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return ok({ loggedOut: true });
}
