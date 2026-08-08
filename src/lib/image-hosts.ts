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
  "airyday.co.uk",
  "assets.adidas.com",
  "assets.andrewmartin.co.uk",
  "assets.aspinaloflondon.com",
  "assets.digitalcontent.marksandspencer.app",
  "boots.scene7.com",
  "boutiquecamping.com",
  "cdn-revamp.airalo.com",
  "cdn.media.amplience.net",
  "cdn.notinoimg.com",
  "cdn11.bigcommerce.com",
  "chloejadehome.com",
  "clubllondon.com",
  "fentybeauty.co.uk",
  "images.beautybay.com",
  "images.hollandandbarrettimages.co.uk",
  "images.mulberry.com",
  "images.riverisland.com",
  "img.ltwebstatic.com",
  "lavishalice.com",
  "main.thgimages.com",
  "mayfairandfinch.co.uk",
  "media.4rgos.it",
  "media.johnlewiscontent.com",
  "media.kurtgeiger.com",
  "mediahub.boohoo.com",
  "mediahub.karenmillen.com",
  "mediahub.prettylittlething.com",
  "res.cloudinary.com",
  "rowenhomes.com",
  "supremecbd.uk",
  "the-mabel.com",
  "unicorn.lush.com",
  "www.apple.com",
  "www.barbour.com",
  "www.charlesandivy.co.uk",
  "www.grahamandgreen.co.uk",
  "www.nadinemerabi.com",
  "www.spacenk.com",
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
