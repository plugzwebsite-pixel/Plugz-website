import { playerUrl } from "@/lib/stream";

/**
 * A creator's clip on their product page.
 *
 * An iframe rather than a `<video>` tag, because Cloudflare serves adaptive
 * streams: the player picks a quality to suit the connection, which is the
 * difference between a clip that plays on a train and one that buffers. It also
 * means no player code of our own to keep working across browsers.
 *
 * Nothing is preloaded. A storefront can carry a dozen of these and a shopper
 * will watch none of them, so the poster frame stands in until somebody presses
 * play.
 */
export function VideoPlayer({
  uid,
  poster,
  title,
}: {
  uid: string;
  poster?: string | null;
  title: string;
}) {
  const src = poster
    ? `${playerUrl(uid)}?poster=${encodeURIComponent(poster)}&preload=none`
    : `${playerUrl(uid)}?preload=none`;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface-2">
      {/* 16:9 without a layout shift while the frame loads. */}
      <div className="relative w-full pt-[56.25%]">
        <iframe
          src={src}
          title={`Video: ${title}`}
          loading="lazy"
          allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
