import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Storing a creator's own portrait.
 *
 * An uploaded file is never trusted and never stored as it arrived. The bytes
 * are decoded, resized and re-encoded as JPEG, which drops any EXIF, any
 * trailing payload, and anything that was only pretending to be an image. SVG
 * is refused outright: it is a document format that can carry script, and a
 * portrait has no reason to be one.
 *
 * Files live under public/uploads/ rather than public/images/, so what a
 * creator uploaded is always distinguishable from what we ship in the repo.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "creators");
const MAX_BYTES = 8 * 1024 * 1024;
const SIDE = 512;

export type AvatarResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function storeAvatar(
  file: File,
  profileId: string
): Promise<AvatarResult> {
  if (file.size === 0) return { ok: false, error: "That file was empty." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That image is over 8MB. Try a smaller one." };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    return { ok: false, error: "That doesn't look like an image we can read." };
  }

  // Decided by the decoder, not by the filename or the browser's content-type.
  const allowed = ["jpeg", "png", "webp", "avif", "gif", "tiff"];
  if (!meta.format || !allowed.includes(meta.format)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }
  if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) {
    return { ok: false, error: "That image is too small. 400×400 or larger works best." };
  }

  // Never enlarge. A 224px photo stretched to 512 is softer than the original
  // and bigger on the wire, for a picture that renders at 80px anyway, so the
  // square is cut at whatever the source can actually give, up to 512.
  const side = Math.min(SIDE, meta.width, meta.height);

  const output = await sharp(buf, { animated: false })
    .rotate() // honour the EXIF orientation before it is discarded
    .resize(side, side, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  await mkdir(UPLOAD_DIR, { recursive: true });
  // Cache-busting suffix: the path is stable per creator otherwise, and a
  // replaced portrait would keep showing the old one from the image cache.
  const name = `${profileId}-${Date.now().toString(36)}.jpg`;
  await writeFile(path.join(UPLOAD_DIR, name), output);

  return { ok: true, url: `/uploads/creators/${name}` };
}

/** Remove a previously stored portrait; a missing file is not an error. */
export async function removeStoredAvatar(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/creators/")) return;
  const name = path.basename(url);
  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch {
    // Already gone, which is the state we wanted.
  }
}
