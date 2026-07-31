"use client";

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
  status: number;
};

/** POST JSON to an internal API route and normalise the response shape. */
export async function postJson<T = unknown>(
  url: string,
  body: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return {
      ok: res.ok && json.ok !== false,
      data: json.data as T,
      message: json.message,
      errors: json.errors,
      status: res.status,
    };
  } catch {
    return {
      ok: false,
      message: "Network error — please check your connection and try again.",
      status: 0,
    };
  }
}
