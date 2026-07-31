import { ok } from "@/lib/http";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getSession();
  return ok({ user });
}
