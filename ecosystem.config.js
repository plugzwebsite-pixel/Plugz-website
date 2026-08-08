/**
 * PM2 process definition for the production server.
 *
 * NODE_OPTIONS pins DNS resolution to IPv4. The server has both an IPv4 and an
 * IPv6 address, and Node was preferring IPv6 for outbound calls — which meant
 * the mail provider saw an address that wasn't on its allow-list and rejected
 * every send. Email failures are non-fatal by design, so this failed silently.
 *
 * Cluster mode across the box's four cores, rather than the single process this
 * ran as before. Password hashing is the reason: bcrypt at cost 12 takes about
 * 350ms and the pure-JS implementation spends nearly all of it on the event
 * loop, so on one process every sign-in stalled every other request on the site
 * for a third of a second. Four workers means a sign-in occupies one of them.
 */
module.exports = {
  apps: [
    {
      name: "pluggz",
      // next start directly, not through npm: PM2 can only fork workers of the
      // process it launched, and with npm in between it would replicate the
      // wrapper and leave one server behind it.
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/srv/pluggz",
      instances: 4,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
      max_memory_restart: "1G",
      autorestart: true,
    },
  ],
};
