import { NextResponse } from "next/server";
import { z } from "zod";
import { fieldErrors } from "./validation";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  message: string,
  status = 400,
  errors?: Record<string, string>
) {
  return NextResponse.json({ ok: false, message, errors }, { status });
}

/** Parse + validate a JSON request body against a Zod schema. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { success: false, response: fail("Invalid request body", 400) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      success: false,
      response: fail("Please check the highlighted fields", 422, fieldErrors(result.error)),
    };
  }
  return { success: true, data: result.data };
}
