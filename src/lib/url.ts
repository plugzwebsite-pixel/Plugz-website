/**
 * The address this server is actually reachable at.
 *
 * `new URL(req.url).origin` is the address nginx dialled, not the one the
 * shopper typed. Behind the proxy it reads localhost:3000, which is how dead
 * tracking links once redirected people to nowhere at all. Prefer the
 * configured public origin, then the host nginx forwarded, and only then
 * whatever the request claims.
 *
 * Anything building a link that will leave this process should use this rather
 * than reading the request, which is the mistake it exists to prevent.
 */
export function publicOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}
