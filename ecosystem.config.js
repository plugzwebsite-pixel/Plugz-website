/**
 * PM2 process definition for the production server.
 *
 * NODE_OPTIONS pins DNS resolution to IPv4. The server has both an IPv4 and an
 * IPv6 address, and Node was preferring IPv6 for outbound calls — which meant
 * the mail provider saw an address that wasn't on its allow-list and rejected
 * every send. Email failures are non-fatal by design, so this failed silently.
 */
module.exports = {
  apps: [
    {
      name: "pluggz",
      script: "npm",
      args: "run start",
      cwd: "/srv/pluggz",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
      max_memory_restart: "1G",
      autorestart: true,
    },
  ],
};
