#!/bin/bash
# scripts/build-flatpak-bundle.sh - Generate a distributable Flatpak bundle on demand.
set -euo pipefail

## Console helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${YELLOW}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}  $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

## Paths and metadata
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -p "require('./package.json').version")"
DIST_DIR="dist"
BUNDLE_PATH="${DIST_DIR}/canva-webapp-linux-${VERSION}.flatpak"

## Usage
usage() {
  cat <<'USAGE'
Usage:
  ./scripts/build-flatpak-bundle.sh [--rebuild-repo]

Options:
  --rebuild-repo   Force rebuilding repo/ before creating the bundle
USAGE
}

## Flags
REBUILD_REPO=false
for arg in "$@"; do
  case "$arg" in
    --rebuild-repo)
      REBUILD_REPO=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      err "Unknown argument: $arg"
      ;;
  esac
done

info "Generating Flatpak bundle for version ${VERSION}"

## Dependency checks
for cmd in flatpak flatpak-builder npm node realpath stat; do
  command -v "$cmd" >/dev/null 2>&1 || err "'$cmd' not found. Install it before continuing."
done

## Repo helpers
repo_has_app_ref() {
  [[ -d repo/refs ]] && find repo/refs -type f -name '*com.canva.WebApp*' | head -1 | grep -q .
}

build_repo() {
  info "Building Flatpak repository"

  flatpak remote-add --if-not-exists --user flathub \
    https://dl.flathub.org/repo/flathub.flatpakrepo

  flatpak install -y --user flathub \
    org.freedesktop.Platform//25.08 \
    org.freedesktop.Sdk//25.08 \
    org.electronjs.Electron2.BaseApp//25.08

  if [[ ! -d node_modules ]]; then
    info "node_modules missing; running npm install"
    npm install
  fi

  info "Building Electron app (target: dir)"
  npm run dist

  UNPACKED_DIR="$(find dist -maxdepth 1 -type d -name 'linux-unpacked' 2>/dev/null | head -1)"
  if [[ -z "$UNPACKED_DIR" ]]; then
    UNPACKED_DIR="$(find dist -maxdepth 1 -type d -name 'linux*unpacked' 2>/dev/null | head -1)"
  fi
  [[ -z "$UNPACKED_DIR" ]] && err "Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?"

  if [[ "$UNPACKED_DIR" != "dist/linux-unpacked" ]]; then
    ln -sfn "$(basename "$UNPACKED_DIR")" dist/linux-unpacked
  fi

  rm -rf build-dir repo
  flatpak-builder \
    --force-clean \
    --user \
    --install-deps-from=flathub \
    --repo=repo \
    build-dir \
    com.canva.WebApp.yml

  flatpak build-update-repo --generate-static-deltas repo
}

## Ensure valid Flatpak repository exists
if [[ "$REBUILD_REPO" == true ]]; then
  build_repo
elif repo_has_app_ref; then
  info "Using existing repo/ directory"
else
  info "repo/ is missing or does not contain com.canva.WebApp refs; rebuilding"
  build_repo
fi

## Create distributable bundle
mkdir -p "$DIST_DIR"
flatpak build-bundle repo "$BUNDLE_PATH" com.canva.WebApp \
  --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo

SIZE_BYTES="$(stat -c '%s' "$BUNDLE_PATH")"
ok "Bundle generated: $(realpath "$BUNDLE_PATH")"
ok "Bundle size: ${SIZE_BYTES} bytes"
