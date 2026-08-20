/**
 * The tracking snippet a Shopify shop pastes into its admin.
 *
 * Written once, here, because the same text has to appear in three places: the
 * admin screen where somebody copies it, the onboarding document a brand is
 * sent, and any message we write about it. Three hand-typed copies would drift,
 * and a drifted snippet is a brand whose sales quietly stop arriving.
 *
 * Only the public key ever goes in. The signing secret must never appear in a
 * page: a pixel runs in the shopper's own browser, where anything it contains
 * can be read by anyone who opens dev tools.
 */

export const PIXEL_ENDPOINT = "/api/track/pixel";

/**
 * Where the pixel should post.
 *
 * Absolute, because the snippet runs on the brand's domain, where a relative
 * path would resolve to their own shop and quietly post into nothing.
 */
export function pixelEndpointUrl(origin?: string): string {
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluggzofficial.co.uk";
  return `${base.replace(/\/+$/, "")}${PIXEL_ENDPOINT}`;
}

/**
 * The snippet itself.
 *
 * Two subscriptions, and both are needed. `page_viewed` catches the Pluggz
 * reference as the shopper arrives and puts it in a cookie, because almost
 * nobody buys on their first visit and the reference would otherwise be gone by
 * checkout. `checkout_completed` is the one that reports the order.
 *
 * It uses `init.context.window` and `browser.cookie` rather than `window` and
 * `document` because a custom pixel runs in a sandbox where the ordinary
 * globals are absent. Code written the usual way fails there silently, which is
 * the worst way for tracking to fail.
 */
export function shopifyPixelSnippet(trackingKey: string, origin?: string): string {
  return `const KEY = ${JSON.stringify(trackingKey)};

analytics.subscribe("page_viewed", async () => {
  const pz = new URLSearchParams(
    init.context.window.location.search
  ).get("pz");
  if (pz) browser.cookie.set(\`pz=\${pz}; max-age=2592000; path=/\`);
});

analytics.subscribe("checkout_completed", async (event) => {
  const pz = await browser.cookie.get("pz");
  if (!pz) return;
  const c = event.data.checkout;
  fetch(${JSON.stringify(pixelEndpointUrl(origin))}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: KEY,
      pz,
      orderRef: String(c.order.id),
      value: Math.round(Number(c.totalPrice.amount) * 100),
      currency: c.currencyCode,
    }),
  });
});`;
}

/**
 * Where to paste it, in the order the screens appear.
 *
 * Kept beside the snippet so the instructions cannot fall out of step with the
 * code they describe. Step seven is the one people miss: saving a pixel does
 * not switch it on, and a shop can sit for a week wondering why no sales are
 * arriving from a pixel that was never connected.
 */
export const SHOPIFY_STEPS: readonly string[] = [
  "In the Shopify admin, open Settings, then Customer events.",
  "Click Add custom pixel and name it Pluggz Affiliate Tracking.",
  "Under Customer privacy, set Permission to Required.",
  "Set Data sale to: data collected does not qualify as data sale.",
  "Paste the snippet into the code box.",
  "Click Save.",
  "Click Connect. Saving alone does not switch the pixel on.",
];
