# Deploying Pluggz

Target: a single Ubuntu 24.04 VPS running the Next.js app behind Nginx, with
PostgreSQL and Redis on the same box and Cloudflare in front.

```
Cloudflare (DNS, TLS, CDN, DDoS)
        │
      Nginx  :80 / :443
        │
   Next.js  :3000   (PM2)
        │
  PostgreSQL + Redis  (localhost only)
```

---

## First time

**1. Provision the server**

```bash
ssh root@SERVER_IP
curl -fsSL https://raw.githubusercontent.com/<repo>/main/deploy/setup-server.sh -o setup.sh
bash setup.sh
```

Installs Node 20, PostgreSQL, Redis, Nginx, PM2, fail2ban, a firewall that only
opens SSH and the web, unattended security updates, and a nightly database dump.
It prints the generated `DATABASE_URL` at the end.

**2. Get the code on the box**

```bash
sudo -u pluggz git clone https://github.com/<repo>.git /srv/pluggz
```

**3. Write `/srv/pluggz/.env`**

```ini
DATABASE_URL="postgresql://pluggz:PASSWORD@localhost:5432/pluggz?schema=public"
AUTH_SECRET="<node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\">"
AUTH_COOKIE_NAME="pluggz_session"
SESSION_MAX_AGE_DAYS="7"

EMAIL_PROVIDER="brevo"
BREVO_API_KEY="<from Brevo dashboard>"
EMAIL_FROM="Pluggz <hello@DOMAIN>"

NEXT_PUBLIC_APP_URL="https://DOMAIN"
NODE_ENV="production"
```

`AUTH_SECRET` must be new. Never reuse the development one. Changing it later
signs every user out.

**4. Deploy**

```bash
sudo -u pluggz bash /srv/pluggz/deploy/deploy.sh
```

**5. Nginx + TLS**

```bash
cp /srv/pluggz/deploy/nginx.conf /etc/nginx/sites-available/pluggz
sed -i 's/DOMAIN_PLACEHOLDER/DOMAIN/g' /etc/nginx/sites-available/pluggz
ln -sf /etc/nginx/sites-available/pluggz /etc/nginx/sites-enabled/pluggz

apt-get install -y certbot python3-certbot-nginx
certbot certonly --nginx -d DOMAIN -d www.DOMAIN
nginx -t && systemctl reload nginx
```

Certbot renews itself via its own systemd timer.

**6. Seed** (only while the catalogue is still placeholder content)

```bash
cd /srv/pluggz && sudo -u pluggz npx dotenv -e .env -- node prisma/seed.mjs
```

---

## Every release after that

```bash
sudo -u pluggz bash /srv/pluggz/deploy/deploy.sh
```

Pulls, installs, syncs the schema, builds, reloads under PM2, then health-checks
`:3000` and fails loudly if the app didn't come back.

---

## Cloudflare

Add the domain, then:

| Type | Name | Content | Proxy |
| ---- | ---- | ------- | ----- |
| A | `@` | `SERVER_IP` | Proxied |
| A | `www` | `SERVER_IP` | Proxied |

- SSL/TLS mode: **Full (strict)**. Anything less leaves the Cloudflare-to-server
  hop unencrypted.
- Always Use HTTPS: on.
- Add SPF, DKIM and DMARC from the Brevo dashboard. Without them the creator
  verification and invite emails land in spam and nobody gets an error.

Because Cloudflare holds the DNS, moving to a different server later is one
record change, and the registrar and the client are never involved again.

---

## Checks after going live

```bash
pm2 status
pm2 logs pluggz --lines 50
systemctl status nginx postgresql redis-server
ufw status
curl -I https://DOMAIN                     # security headers present
curl -I https://DOMAIN/dev/mailbox         # must be 307 to /
curl -sI https://DOMAIN/go/TESTCODE        # 302, Cache-Control: no-store
```

Point UptimeRobot (free) at `https://DOMAIN/go/<a real code>` rather than the
homepage. That route is the one carrying every creator link already published to
social; if it breaks, those links fail silently and nobody finds out.

---

## Rollback

```bash
cd /srv/pluggz
git log --oneline -5
git checkout <previous-sha>
bash deploy/deploy.sh
```

Database restore:

```bash
gunzip -c /var/backups/pluggz/pluggz-YYYY-MM-DD.sql.gz | sudo -u postgres psql pluggz
```
