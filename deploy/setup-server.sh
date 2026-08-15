#!/usr/bin/env bash
#
# Pluggz: one-time server provisioning for Ubuntu 24.04.
#
# Run once as root on a fresh Contabo VPS:
#   bash setup-server.sh
#
# Safe to re-run: every step checks before it acts.
#
set -euo pipefail

APP_USER=pluggz
APP_DIR=/srv/pluggz
PM2_HOME_DIR=/var/lib/pluggz-pm2
DB_NAME=pluggz
DB_USER=pluggz
NODE_MAJOR=20

log() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
log "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl ca-certificates gnupg git ufw fail2ban unattended-upgrades \
  nginx postgresql postgresql-contrib redis-server

# Security updates apply themselves; this box will not be patched by hand.
dpkg-reconfigure -f noninteractive unattended-upgrades

# ---------------------------------------------------------------------------
log "Firewall"
# Deny everything inbound except SSH and the web. Postgres and Redis are
# deliberately NOT opened. They are reached over localhost only.
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status verbose

log "fail2ban (SSH brute-force protection)"
systemctl enable --now fail2ban

# ---------------------------------------------------------------------------
log "Application user"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --system --group --home "$APP_DIR" --shell /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------------------------------------------------------------------------
log "Node.js $NODE_MAJOR"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v
npm -v

log "PM2"
npm install -g pm2@latest >/dev/null

# PM2's home must sit OUTSIDE the application directory. Pointing it at the app
# user's home puts .pm2/ inside /srv/pluggz, and the bundler walks that tree at
# build time. It tries to read pub.sock, which isn't a readable file, and the
# build dies with an unrelated-looking CSS error.
install -d -o "$APP_USER" -g "$APP_USER" "$PM2_HOME_DIR"
echo "export PM2_HOME=$PM2_HOME_DIR" > /etc/profile.d/pluggz-pm2.sh
chmod 644 /etc/profile.d/pluggz-pm2.sh

cat > /etc/systemd/system/pm2-$APP_USER.service <<UNIT
[Unit]
Description=PM2 process manager for Pluggz
After=network.target postgresql.service redis-server.service

[Service]
Type=forking
User=$APP_USER
LimitNOFILE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PM2_HOME=$PM2_HOME_DIR
PIDFile=$PM2_HOME_DIR/pm2.pid
Restart=on-failure
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "pm2-$APP_USER" >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
log "PostgreSQL"
systemctl enable --now postgresql

# Generate a password once and keep it; re-running must not rotate it and
# break the app's existing DATABASE_URL.
PW_FILE=/root/.pluggz-db-password
if [[ ! -f "$PW_FILE" ]]; then
  head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 32 > "$PW_FILE"
  chmod 600 "$PW_FILE"
fi
DB_PASS="$(cat "$PW_FILE")"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -qc "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -qc "ALTER ROLE $DB_USER PASSWORD '$DB_PASS';"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# Prisma needs to create extensions and manage the public schema.
sudo -u postgres psql -d "$DB_NAME" -qc "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Confirm Postgres is not listening on anything but localhost.
PG_LISTEN=$(sudo -u postgres psql -tAc "SHOW listen_addresses;")
echo "postgres listen_addresses = $PG_LISTEN  (must be localhost)"

# ---------------------------------------------------------------------------
log "Redis"
# Bound to loopback, no external exposure. Used for rate limiting and click
# de-duplication.
sed -i 's/^# *maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf || true
sed -i 's/^# *maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf || true
grep -q '^bind 127.0.0.1' /etc/redis/redis.conf || sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
systemctl enable --now redis-server
systemctl restart redis-server
redis-cli ping

# ---------------------------------------------------------------------------
log "Nginx"
systemctl enable --now nginx
rm -f /etc/nginx/sites-enabled/default

# ---------------------------------------------------------------------------
log "Nightly database backup"
install -d -m 700 /var/backups/pluggz
cat >/usr/local/bin/pluggz-backup <<'BACKUP'
#!/usr/bin/env bash
# Nightly dump, 14 days kept. Contabo's own backup covers the whole machine;
# this covers "someone dropped a table at 2am", which machine snapshots do not.
set -euo pipefail
STAMP=$(date +%F)
OUT=/var/backups/pluggz/pluggz-$STAMP.sql.gz
sudo -u postgres pg_dump pluggz | gzip > "$OUT"
chmod 600 "$OUT"
find /var/backups/pluggz -name 'pluggz-*.sql.gz' -mtime +14 -delete
BACKUP
chmod +x /usr/local/bin/pluggz-backup
cat >/etc/cron.d/pluggz-backup <<'CRON'
30 3 * * * root /usr/local/bin/pluggz-backup >/dev/null 2>&1
CRON

# ---------------------------------------------------------------------------
log "Done"
cat <<SUMMARY

  Server is ready. Next:

  1. Put the code in $APP_DIR (see deploy/README.md)
  2. Write $APP_DIR/.env. The database URL is:

       DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

     (also saved at $PW_FILE)

  3. bash deploy/deploy.sh
  4. Point Nginx at the domain: deploy/nginx.conf

SUMMARY
