import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { thumbnailUrl } from "@/lib/stream";

/**
 * Cloudflare telling us a clip has finished encoding.
 *
 * Polling alone is not enough. A creator who uploads and then closes the tab
 * would leave their video stuck as processing for ever, because nothing would
 * be left asking. This arrives whether or not anybody is watching, so the two
 * together mean a clip goes live either way.
 *
 * Cloudflare signs the body with a secret shown once when the webhook is
 * created. Without checking it, anyone who learned the address could mark any
 * clip ready, or worse, mark one ready that had been taken down.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * The header is `time=<unix>,sig1=<hex>` and the signed value is
 * `<time>.<body>`. The timestamp is part of it so an old, genuine call cannot
 * be replayed for ever.
 */
function signatureValid(header: string, raw: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const at = p.indexOf("=");
      return [p.slice(0, at).trim(), p.slice(at + 1).trim()];
    })
  );
  const time = parts.time;
  const given = parts.sig1;
  if (!time || !given) return false;

  // Five minutes, which is generous for a webhook and short enough that a
  // captured call is not useful tomorrow.
  const age = Math.abs(Date.now() / 1000 - Number(time));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET?.trim();
  if (!secret) return reply({ ok: false, error: "Not configured." }, 503);

  const header = req.headers.get("webhook-signature");
  if (!header) return reply({ ok: false, error: "Unsigned." }, 401);

  const raw = await req.text();
  if (!signatureValid(header, raw, secret)) {
    return reply({ ok: false, error: "Signature did not match." }, 401);
  }

  let body: { uid?: string; readyToStream?: boolean; status?: { state?: string }; duration?: number };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply({ ok: false, error: "Body must be a JSON object." }, 400);
    }
    body = parsed;
  } catch {
    return reply({ ok: false, error: "Body was not valid JSON." }, 400);
  }

  const uid = body.uid?.trim();
  if (!uid) return reply({ ok: false, error: "No uid." }, 400);

  const row = await db.creatorVideo.findUnique({
    where: { uid },
    select: { id: true, review: true },
  });
  // A clip we no longer track, most likely one the creator replaced. Answered
  // with a 200 so Cloudflare stops retrying something that will never match.
  if (!row) return reply({ ok: true, ignored: true }, 200);

  // A clip taken down by moderation stays down, whatever Cloudflare says about
  // it afterwards.
  if (row.review === "REMOVED") return reply({ ok: true, ignored: true }, 200);

  const state =
    body.readyToStream ? "READY"
    : body.status?.state === "error" ? "FAILED"
    : "PROCESSING";

  await db.creatorVideo.update({
    where: { id: row.id },
    data: {
      state,
      readyAt: state === "READY" ? new Date() : null,
      durationSeconds: body.duration ? Math.round(body.duration) : undefined,
      thumbnailUrl: state === "READY" ? thumbnailUrl(uid) : null,
    },
  });

  return reply({ ok: true, state }, 200);
}
