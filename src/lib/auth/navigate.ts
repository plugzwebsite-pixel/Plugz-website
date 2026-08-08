/**
 * Leave a signed-in session the only way that is actually safe: a full page load.
 *
 * Next keeps rendered payloads for visited routes in a client-side Router Cache.
 * `router.refresh()` only invalidates the route you are currently on — it does
 * not throw away what it holds for every *other* route you visited. So signing
 * out of one account and into another could be served the previous account's
 * cached dashboard, with freshly rendered fragments showing the new user's
 * details next to it. Signing in as an admin and landing on the creator
 * dashboard is exactly that, and it cleared on a manual refresh because a real
 * page load is the thing that empties the cache.
 *
 * A hard navigation discards the Router Cache, every client component's state
 * and any in-flight request together. Auth transitions are rare and correctness
 * matters far more than the few hundred milliseconds this costs.
 */
export function hardNavigate(destination: string): void {
  // Same-origin only: this takes a value that has come back from an API, and a
  // redirect is not somewhere a response body gets to choose.
  const safe =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/";
  window.location.assign(safe);
}
