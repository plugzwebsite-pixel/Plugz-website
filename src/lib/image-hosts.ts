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
 *
 * **Next allows at most 50 remote patterns and refuses to build past that**, so
 * this list is full. Adding a host now means retiring one, and the honest way
 * to choose is by weight: everything left off serves its own file whole through
 * SmartImage, which is fine at a hundred kilobytes and expensive at a megabyte.
 * The heaviest photography earns its place here.
 */
export const OPTIMISED_IMAGE_HOSTS = [
  "airyday.co.uk",
  "assets.adidas.com",
  "assets.andrewmartin.co.uk",
  "assets.aspinaloflondon.com",
  "assets.digitalcontent.marksandspencer.app",
  "auvodka.co.uk",
  "boots.scene7.com",
  "boutiquecamping.com",
  "cdn-revamp.airalo.com",
  "cdn.media.amplience.net",
  "cdn.notinoimg.com",
  "cdn.shopify.com",
  "cdn11.bigcommerce.com",
  "chloejadehome.com",
  "clubllondon.com",
  "damsonmadder.com",
  "dtcralphlauren.scene7.com",
  "fentybeauty.co.uk",
  "hrd-live.cdn.scayle.cloud",
  "images.beautybay.com",
  "images.hollandandbarrettimages.co.uk",
  "images.mulberry.com",
  "images.riverisland.com",
  "img.ltwebstatic.com",
  "lavishalice.com",
  "main.thgimages.com",
  "mayfairandfinch.co.uk",
  "media.4rgos.it",
  "media.diy.com",
  "media.johnlewiscontent.com",
  "media.kurtgeiger.com",
  "mediahub.boohoo.com",
  "mediahub.karenmillen.com",
  "mediahub.prettylittlething.com",
  "res.cloudinary.com",
  "rowenhomes.com",
  "shop.elfontheshelf.co.uk",
  "supremecbd.uk",
  "the-mabel.com",
  "unicorn.lush.com",
  "www.apple.com",
  "www.barbour.com",
  "www.charlesandivy.co.uk",
  "www.grahamandgreen.co.uk",
  "www.havaianas-store.com",
  "www.hollandcooper.com",
  "www.nadinemerabi.com",
  "www.nakeddresses.com",
  "www.scarlettlily.co.uk",
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
