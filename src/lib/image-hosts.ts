/**
 * Brand image hosts the optimiser is allowed to fetch from.
 *
 * Product photos are scraped from whatever brand site a creator pasted, so most
 * hostnames aren't known ahead of time. Letting next/image resize any remote
 * host would turn this server into an open image proxy — anyone could point it
 * at arbitrary URLs and spend our CPU and bandwidth. So the optimiser gets an
 * allowlist, and everything else is served as-is by SmartImage.
 *
 * It is worth adding a host here once a brand is live. Sweaty Betty's own
 * photography is 2884x3508 and a megabyte each; resized and re-encoded for the
 * card it actually appears in, the same image is around 18KB.
 *
 * Both this list and next.config.ts's remotePatterns are generated from here,
 * so a host can only ever be allowed in one place.
 */
export const OPTIMISED_IMAGE_HOSTS = [
  "cdn.media.amplience.net",
  "www.oliverbonas.com",
] as const;

export function isOptimisableHost(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== "https:") return false;
    return (OPTIMISED_IMAGE_HOSTS as readonly string[]).includes(hostname);
  } catch {
    return false;
  }
}
