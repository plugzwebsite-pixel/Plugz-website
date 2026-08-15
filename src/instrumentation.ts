/**
 * Runs once, in-process, as the server starts.
 *
 * Outbound connections must go over IPv4. The box has both an IPv4 and an IPv6
 * address, and Node prefers IPv6 when a host offers both, but only the IPv4 is
 * on the mail provider's authorised list, so every send came back 401 naming
 * the v6 address, and email failures are non-fatal by design so nothing broke
 * loudly. Verification and password-reset mail simply stopped arriving.
 *
 * This was previously handled by passing --dns-result-order=ipv4first through
 * PM2's NODE_OPTIONS. That is too easy to lose: moving PM2 to cluster mode
 * dropped it silently and the mail stopped again with no other symptom. Setting
 * it here means it holds however the process was started: pm2, npm start,
 * next start, or a plain node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const dns = await import("node:dns");
  dns.setDefaultResultOrder("ipv4first");
}
