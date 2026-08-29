import "server-only";

/**
 * Cloudflare Stream, which is where creator video lives.
 *
 * The file never touches this server. Cloudflare hands out a one-time upload
 * address, the creator's browser sends the file straight there, and we only
 * ever hold an identifier. That is the whole reason for choosing a video host
 * rather than storing clips ourselves: a platform of phone footage would
 * otherwise need storage, bandwidth, transcoding and a player, and would fall
 * over on the first creator who uploads from a modern handset.
 *
 * Everything here fails soft. If Stream is not configured, or Cloudflare is
 * having a bad afternoon, the rest of the site carries on and the video screens
 * say plainly that uploads are unavailable. A storefront must not break because
 * a video service did.
 */

const API = "https://api.cloudflare.com/client/v4";

/** Long enough for a creator to pick a file and for a large clip to upload. */
const UPLOAD_WINDOW_SECONDS = 60 * 60;

/** Anything longer is a film, not a product clip, and costs storage to keep. */
export const MAX_VIDEO_SECONDS = 180;

export type StreamConfig = { accountId: string; token: string };

/**
 * The credentials, or null.
 *
 * Read at call time rather than at module load so the server does not have to
 * be rebuilt to switch video on: adding the two values and restarting is
 * enough.
 */
export function streamConfig(): StreamConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_STREAM_TOKEN?.trim();
  if (!accountId || !token) return null;
  return { accountId, token };
}

export function streamConfigured(): boolean {
  return streamConfig() !== null;
}

export class StreamError extends Error {
  /** Cloudflare's own code, so a caller can tell why without reading English. */
  readonly code: number | null;

  constructor(message: string, code: number | null = null) {
    super(message);
    this.code = code;
  }

  /**
   * Out of storage, rather than anything wrong with the request.
   *
   * Worth its own question because it is not a fault: the account simply has
   * no minutes left, and the person who can fix it is whoever holds the
   * Cloudflare billing, not the creator staring at an upload button.
   */
  get isQuota(): boolean {
    return this.code === 10011 || /storage capacity|quota/i.test(this.message);
  }
}

async function call<T>(
  path: string,
  init: RequestInit & { cfg: StreamConfig }
): Promise<T> {
  const { cfg, ...rest } = init;
  const res = await fetch(`${API}/accounts/${cfg.accountId}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
    // Video calls are never worth caching, and a stale answer about whether a
    // clip is ready is worse than no answer.
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; result?: T; errors?: { message?: string; code?: number }[] }
    | null;

  if (!res.ok || !json?.success) {
    const detail = json?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    const code = json?.errors?.find((e) => typeof e.code === "number")?.code ?? null;
    throw new StreamError(detail || `Cloudflare Stream returned ${res.status}`, code);
  }
  return json.result as T;
}

export type DirectUpload = { uid: string; uploadUrl: string };

/**
 * A one-time address for the creator's browser to upload to.
 *
 * `maxDurationSeconds` is enforced by Cloudflare on their side, so a long file
 * is refused during upload rather than after we have paid to store it.
 */
export async function createDirectUpload(meta: {
  creatorHandle: string;
  listingId: string;
}): Promise<DirectUpload> {
  const cfg = streamConfig();
  if (!cfg) throw new StreamError("Video uploads are not configured.");

  const result = await call<{ uid: string; uploadURL: string }>(
    "/stream/direct_upload",
    {
      cfg,
      method: "POST",
      body: JSON.stringify({
        maxDurationSeconds: MAX_VIDEO_SECONDS,
        expiry: new Date(Date.now() + UPLOAD_WINDOW_SECONDS * 1000).toISOString(),
        requireSignedURLs: false,
        // Carried back on the webhook, so a clip can be matched to its listing
        // without us keeping a separate table of in-flight uploads.
        meta: { creator: meta.creatorHandle, listingId: meta.listingId },
      }),
    }
  );

  return { uid: result.uid, uploadUrl: result.uploadURL };
}

export type StreamVideo = {
  uid: string;
  readyToStream: boolean;
  status: { state: string; errorReasonText?: string };
  duration?: number;
  thumbnail?: string;
  /** Cloudflare's own embed address for this clip. */
  preview?: string;
};

export async function getVideo(uid: string): Promise<StreamVideo | null> {
  const cfg = streamConfig();
  if (!cfg) return null;
  try {
    return await call<StreamVideo>(`/stream/${encodeURIComponent(uid)}`, {
      cfg,
      method: "GET",
    });
  } catch {
    // A clip that has been deleted at Cloudflare answers 404, and the caller
    // wants "no longer there" rather than an exception.
    return null;
  }
}

export async function deleteVideo(uid: string): Promise<void> {
  const cfg = streamConfig();
  if (!cfg) return;
  try {
    await call(`/stream/${encodeURIComponent(uid)}`, { cfg, method: "DELETE" });
  } catch {
    // Already gone is the state we wanted. A clip left behind costs pennies of
    // storage, and throwing here would fail a takedown that has already been
    // applied on our side, which is far worse.
  }
}

/**
 * Where the player loads from.
 *
 * `iframe.videodelivery.net` rather than the `customer-<code>` host, because
 * that code is a per-account subdomain that is not the account id and is not
 * knowable from configuration. This form needs only the clip's own identifier,
 * so it cannot be built wrong.
 *
 * Public by design: these play on a public storefront, and signing them would
 * only mean every shopper needing a token to watch a promotional clip.
 */
export function playerUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`;
}

export function thumbnailUrl(uid: string): string {
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
}
