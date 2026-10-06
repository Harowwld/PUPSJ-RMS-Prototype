#!/bin/bash
set -Eeuo pipefail

DMG_PATH=""
MOUNT_PATH=""
cleanup_on_exit() {
  status=$?
  set +e
  if [[ -n "$MOUNT_PATH" ]]; then hdiutil detach "$MOUNT_PATH" -quiet >/dev/null 2>&1; fi
  if [[ -n "$MOUNT_PATH" ]]; then rm -rf "$MOUNT_PATH"; fi
  if [[ -n "$DMG_PATH" ]]; then rm -f "$DMG_PATH"; fi
  if [[ "$status" -ne 0 ]]; then
    echo
    echo "Installation stopped (exit code $status). Review the message above."
    read -r -p "Press Return to close this window..." _ || true
  fi
}
trap cleanup_on_exit EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_ROOT="$HOME/Library/Application Support/PUPSJ-RMS"
APP_ROOT="$INSTALL_ROOT/app"
HOT_FOLDER="$INSTALL_ROOT/hot-folder"
DOCKER_APP="/Applications/Docker.app"
INSTALL_USER="$(id -un)"

echo "Installing PUPSJ RMS for $INSTALL_USER"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer only runs on macOS."
  exit 1
fi

if [[ ! -d "$DOCKER_APP" ]]; then
  case "$(uname -m)" in
    arm64) DOCKER_ARCH="arm64" ;;
    x86_64) DOCKER_ARCH="amd64" ;;
    *) echo "Unsupported Mac processor: $(uname -m)"; exit 1 ;;
  esac

  DMG_PATH="$(mktemp "${TMPDIR:-/tmp}/pupsj-docker.XXXXXX")"
  MOUNT_PATH="$(mktemp -d "${TMPDIR:-/tmp}/pupsj-docker-mount.XXXXXX")"
  cleanup_docker_dmg() {
    hdiutil detach "$MOUNT_PATH" -quiet >/dev/null 2>&1 || true
    rm -rf "$MOUNT_PATH" "$DMG_PATH"
    MOUNT_PATH=""
    DMG_PATH=""
  }

  echo "Downloading Docker Desktop for Mac ($DOCKER_ARCH)."
  curl --fail --location --show-error \
    "https://desktop.docker.com/mac/main/$DOCKER_ARCH/Docker.dmg" \
    --output "$DMG_PATH"
  hdiutil attach -nobrowse -quiet -mountpoint "$MOUNT_PATH" "$DMG_PATH"
  echo "Installing Docker Desktop in /Applications. macOS will ask for your password."
  sudo ditto "$MOUNT_PATH/Docker.app" "$DOCKER_APP"
  sudo "$DOCKER_APP/Contents/MacOS/install" --user "$INSTALL_USER"
  cleanup_docker_dmg
fi

mkdir -p "$INSTALL_ROOT" "$HOT_FOLDER" "$HOME/Desktop"
rsync -a --delete \
  --exclude='.env' --exclude='.local/' --exclude='node_modules/' \
  --exclude='.next/' --exclude='.git/' \
  "$SOURCE_ROOT/" "$APP_ROOT/"

if [[ ! -f "$APP_ROOT/.env" ]]; then
  read -r -s -p "Choose the initial staff password (at least 12 letters or numbers): " STAFF_PASSWORD
  echo
  if [[ ! "$STAFF_PASSWORD" =~ ^[A-Za-z0-9]{12,}$ ]]; then
    echo "Use at least 12 letters or numbers, then run this installer again."
    exit 1
  fi

  JWT_SECRET="$(openssl rand -hex 32)"
  DB_PASSWORD="$(openssl rand -hex 24)"
  INGEST_TOKEN="$(openssl rand -hex 32)"
  awk \
    -v db_password="$DB_PASSWORD" \
    -v jwt_secret="$JWT_SECRET" \
    -v staff_password="$STAFF_PASSWORD" \
    -v ingest_token="$INGEST_TOKEN" \
    -v hot_folder="$HOT_FOLDER" '
      /^POSTGRES_PASSWORD=/ { print "POSTGRES_PASSWORD=" db_password; next }
      /^JWT_SECRET=/ { print "JWT_SECRET=" jwt_secret; next }
      /^DEFAULT_STAFF_PASSWORD=/ { print "DEFAULT_STAFF_PASSWORD=" staff_password; next }
      /^HOT_FOLDER_INGEST_TOKEN=/ { print "HOT_FOLDER_INGEST_TOKEN=" ingest_token; next }
      /^HOT_FOLDER_HOST_PATH=/ { print "HOT_FOLDER_HOST_PATH=" hot_folder; next }
      { print }
    ' "$APP_ROOT/.env.example" > "$APP_ROOT/.env"
  chmod 600 "$APP_ROOT/.env"
  unset STAFF_PASSWORD JWT_SECRET DB_PASSWORD INGEST_TOKEN
fi
chmod 600 "$APP_ROOT/.env"

export PATH="$HOME/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
open -a "$DOCKER_APP"
DOCKER_CLI="$(command -v docker || true)"
if [[ -z "$DOCKER_CLI" && -x "$DOCKER_APP/Contents/Resources/bin/docker" ]]; then
  DOCKER_CLI="$DOCKER_APP/Contents/Resources/bin/docker"
fi
if [[ -z "$DOCKER_CLI" ]]; then
  echo "Docker Desktop is installed, but its Docker CLI was not found. Open Docker Desktop and rerun this installer."
  exit 1
fi

echo "Waiting for Docker Desktop. Accept its first-run terms in the Docker window if prompted."
ENGINE_READY=false
for attempt in {1..120}; do
  if "$DOCKER_CLI" info >/dev/null 2>&1; then ENGINE_READY=true; break; fi
  sleep 5
done
if [[ "$ENGINE_READY" != true ]]; then
  echo "Docker Desktop is not ready. Finish its first-run setup and run this installer again."
  exit 1
fi

cd "$APP_ROOT"
echo "Building and starting PUPSJ RMS. The first build can take several minutes."
"$DOCKER_CLI" compose up -d --build --wait
"$DOCKER_CLI" compose exec -T app node scripts/secure-installed-accounts.mjs

{
  printf '#!/bin/bash\nset -e\nexport PATH="$HOME/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"\n'
  printf 'DOCKER_CLI=%q\n' "$DOCKER_CLI"
  cat <<'START_SCRIPT'
cd "$(dirname "$0")"
open -a Docker
for attempt in {1..120}; do
  "$DOCKER_CLI" info >/dev/null 2>&1 && break
  sleep 5
done
"$DOCKER_CLI" info >/dev/null 2>&1 || { echo "Docker Desktop is not ready."; read -r -p "Press Return to close..." _; exit 1; }
"$DOCKER_CLI" compose up -d --wait
open http://localhost:3000
START_SCRIPT
} > "$APP_ROOT/Start PUPSJ RMS.command"
{
  printf '#!/bin/bash\nset -e\nexport PATH="$HOME/.docker/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"\n'
  printf 'DOCKER_CLI=%q\n' "$DOCKER_CLI"
  cat <<'STOP_SCRIPT'
cd "$(dirname "$0")"
"$DOCKER_CLI" compose down
read -r -p "PUPSJ RMS is stopped. Press Return to close..." _
STOP_SCRIPT
} > "$APP_ROOT/Stop PUPSJ RMS.command"
chmod 755 "$APP_ROOT/Start PUPSJ RMS.command" "$APP_ROOT/Stop PUPSJ RMS.command"
ln -sfn "$APP_ROOT/Start PUPSJ RMS.command" "$HOME/Desktop/PUPSJ RMS.command"
ln -sfn "$APP_ROOT/Stop PUPSJ RMS.command" "$HOME/Desktop/Stop PUPSJ RMS.command"

open http://localhost:3000
echo
echo "PUPSJ RMS is installed and running at http://localhost:3000"
echo "Initial SuperAdmin login: superadmin@pup.local"
echo "Use the staff password you chose during setup. Keep it private."
echo "Start and Stop launchers were added to your Desktop."
read -r -p "Installation complete. Press Return to close..." _ || true
