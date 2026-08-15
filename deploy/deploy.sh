#!/usr/bin/env bash
#
# Pluggz: build and (re)start the app. Run for every release.
#
#   sudo -u pluggz bash /srv/pluggz/deploy/deploy.sh
#
set -euo pipefail

APP_DIR=/srv/pluggz
# PM2 keeps its state outside the app directory. See setup-server.sh.
export PM2_HOME=/var/lib/pluggz-pm2
cd "$APP_DIR"

log() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }

if [[ ! -f .env ]]; then
  echo "No .env in $APP_DIR. Copy .env.example and fill it in first." >&2
  exit 1
fi

log "Pulling latest"
git pull --ff-only

log "Installing dependencies"
npm ci

log "Applying database schema"
# db push rather than migrate: the app's Postgres role intentionally lacks the
# CREATEDB privilege that `prisma migrate` needs for its shadow database.
npx prisma db push --skip-generate
npx prisma generate

log "Building"
npm run build

log "Restarting"
if pm2 describe pluggz >/dev/null 2>&1; then
  pm2 reload pluggz --update-env
else
  pm2 start npm --name pluggz -- run start
fi
pm2 save

log "Health check"
sleep 3
for i in $(seq 1 10); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
    echo "App is responding on :3000"
    exit 0
  fi
  sleep 2
done

echo "App did not respond on :3000. Check: pm2 logs pluggz" >&2
exit 1
