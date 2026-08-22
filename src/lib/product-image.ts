import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

/**
 * Storing a product photograph a brand uploaded.
 *
 * The same rules as a creator's portrait, and for the same reason: an uploaded
 * file is never trusted and never stored as it arrived. The bytes are decoded,
 * resized and re-encoded, which drops EXIF, any trailing payload, and anything
 * that was only pretending to be an image. SVG is refused because it is a
 * document format that can carry script.
 *
 * Two things differ from a portrait. The shape is left alone rather than cropped
 * square, since a product shot cropped to a square loses the product. And the
 * filename is random rather than derived from an id, because a brand uploads
 * many of these and a guessable name would let one brand read another's.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1400;

export type StoredImage = { ok: true; url: string } | { ok: false; error: string };

export async function storeProductImage(file: File): Promise<StoredImage> {
  if (file.size === 0) return { ok: false, error: "That file was empty." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That image is over 10MB. Try a smaller one." };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    return { ok: false, error: "That doesn't look like an image we can read." };
  }

  // Decided by the decoder, not by the filename or the browser's content-type,
  // either of which the caller controls.
  const allowed = ["jpeg", "png", "webp", "avif", "gif", "tiff"];
  if (!meta.format || !allowed.includes(meta.format)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 300) {
    return { ok: false, error: "That image is too small. 600 pixels or wider works best." };
  }

  const output = await sharp(buf, { animated: false })
    .rotate() // honour the EXIF orientation before it is discarded
    // `inside` keeps the shape and never enlarges, so a photograph smaller than
    // the limit is stored as it is rather than blown up and softened.
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.jpg`;
  await writeFile(path.join(UPLOAD_DIR, name), output);

  return { ok: true, url: `/uploads/products/${name}` };
}

/** Remove a stored product photograph; a missing file is not an error. */
export async function removeStoredProductImage(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/products/")) return;
  const name = path.basename(url);
  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch {
    // Already gone, which is the state we wanted.
  }
}
