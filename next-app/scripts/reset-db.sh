#!/usr/bin/env bash
# Calls the dev API to wipe the SQLite DB, uploads, and re-seed the default admin.
# Requires the Next.js dev server (or production server) to be running.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "[reset-db] GET ${BASE_URL}/api/system/reset-db"
curl -X GET "${BASE_URL}/api/system/reset-db"
echo
echo "[reset-db] If the response was ok, restart the Next.js server, then run: pnpm populate-sample-data"
