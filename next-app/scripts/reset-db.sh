#!/usr/bin/env bash
# Reset the local database through the authenticated, confirmation-protected API.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
RESET_USERNAME="${RESET_USERNAME:-superadmin@pup.local}"
RESET_PASSWORD="${RESET_PASSWORD:-$(node --input-type=module -e 'import dotenv from "dotenv"; dotenv.config({ path: ".env" }); process.stdout.write(process.env.DEFAULT_STAFF_PASSWORD || "pupstaff")')}"

tmp_dir="$(mktemp -d)"
chmod 700 "$tmp_dir"
trap 'rm -rf "$tmp_dir"' EXIT
cookie_jar="$tmp_dir/cookies.txt"
login_response="$tmp_dir/login.json"
reset_response="$tmp_dir/reset.json"

login_payload="$(RESET_USERNAME="$RESET_USERNAME" RESET_PASSWORD="$RESET_PASSWORD" node -e 'process.stdout.write(JSON.stringify({ username: process.env.RESET_USERNAME, password: process.env.RESET_PASSWORD }))')"
unset RESET_PASSWORD

echo "[reset-db] Authenticating as ${RESET_USERNAME}"
login_status="$(curl --silent --show-error --output "$login_response" --write-out '%{http_code}' \
  --cookie-jar "$cookie_jar" \
  --header 'Content-Type: application/json' \
  --data "$login_payload" \
  "${BASE_URL}/api/auth/login")"
unset login_payload

if [[ "$login_status" != "200" ]] || ! node -e 'const r = require(process.argv[1]); process.exit(r?.ok && !r?.data?.totpRequired ? 0 : 1)' "$login_response"; then
  echo "[reset-db] SuperAdmin login failed (HTTP ${login_status}). Check RESET_USERNAME, RESET_PASSWORD, and whether two-factor authentication is enabled." >&2
  cat "$login_response" >&2
  exit 1
fi

csrf_token="$(awk '$6 == "pup_csrf" { print $7 }' "$cookie_jar")"
if [[ -z "$csrf_token" ]]; then
  echo "[reset-db] Login did not return the required CSRF cookie." >&2
  exit 1
fi

echo "[reset-db] POST ${BASE_URL}/api/system/reset-db"
reset_status="$(curl --silent --show-error --output "$reset_response" --write-out '%{http_code}' \
  --cookie "$cookie_jar" \
  --header 'Content-Type: application/json' \
  --header "Origin: ${BASE_URL}" \
  --header "X-CSRF-Token: ${csrf_token}" \
  --data '{"confirmation":"RESET_LOCAL_DATABASE"}' \
  "${BASE_URL}/api/system/reset-db")"

cat "$reset_response"
echo
if [[ "$reset_status" != "200" ]] || ! node -e 'const r = require(process.argv[1]); process.exit(r?.ok ? 0 : 1)' "$reset_response"; then
  echo "[reset-db] Reset failed (HTTP ${reset_status}). No success was reported by the API." >&2
  exit 1
fi

echo "[reset-db] Reset completed. Restart the Next.js server if needed, then run: pnpm populate-sample-data"
