#!/usr/bin/env bash
# Build Gospel Labs and publish it to Atlas at https://gospellabs.softlockedlive.com
#
# Uploads the build next to the live folder, then swaps the two, so visitors never
# see a half-uploaded site and files from old builds don't pile up. The previous
# build is kept as .gospellabs-previous for a quick rollback (see README).
#
# Caddy on Atlas serves the folder and adds the security headers; see the
# gospellabs block in /opt/web/Caddyfile.
set -euo pipefail

HOST="atlas"
SITE="/srv/www/gospellabs.softlockedlive.com"
URL="https://gospellabs.softlockedlive.com"

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Note: you have uncommitted changes; deploying them anyway."
fi

rm -rf out
npm run build
[ -f out/index.html ] || { echo "Build did not produce out/index.html; not deploying." >&2; exit 1; }

echo "Uploading to $HOST..."
# Dot-prefixed folders can't match a hostname, so Caddy never serves them.
tar -C out -cf - . | ssh "$HOST" "
  set -e
  cd /srv/www
  rm -rf .gospellabs-new
  mkdir .gospellabs-new
  tar -C .gospellabs-new --no-same-owner -xf -
  chmod -R g+w,o+rX .gospellabs-new
  rm -rf .gospellabs-previous
  if [ -d '$SITE' ]; then mv '$SITE' .gospellabs-previous; fi
  mv .gospellabs-new '$SITE'
"

status=$(curl -s -o /dev/null -w '%{http_code}' "$URL/")
if [ "$status" = "200" ]; then
  echo "Deployed $(git rev-parse --short HEAD) to $URL"
else
  echo "Deployed, but $URL/ answered $status. Check it in a browser." >&2
  exit 1
fi
