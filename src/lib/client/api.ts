"use client";

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
  status: number;
};

/** Send a JSON body to an internal API route and normalise the response shape. */
async function sendJson<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
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
      message: "Network error. Please check your connection and try again.",
      status: 0,
    };
  }
}

export function postJson<T = unknown>(url: string, body: unknown) {
  return sendJson<T>(url, "POST", body);
}

export function patchJson<T = unknown>(url: string, body: unknown) {
  return sendJson<T>(url, "PATCH", body);
}
