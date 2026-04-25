#!/bin/bash
# scripts/install-flatpak-local.sh - Build and install Canva Flatpak locally for development/testing.
set -euo pipefail

## Console helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${YELLOW}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

## Paths and metadata
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -p "require('./package.json').version")"
source "${SCRIPT_DIR}/flatpak-build-common.sh"

## Usage
usage() {
  cat <<'USAGE'
Usage:
  ./scripts/install-flatpak-local.sh [--skip-npm]

Options:
  --skip-npm   Skip npm install + npm run dist (requires existing dist/linux-unpacked)
USAGE
}

## Flags
SKIP_NPM=false
for arg in "$@"; do
  case "$arg" in
    --skip-npm)
      SKIP_NPM=true
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

info "Preparing local Flatpak install for Canva WebApp v${VERSION}"

## Dependency checks
BASE_DEPS=(flatpak flatpak-builder node)
for cmd in "${BASE_DEPS[@]}"; do
  command -v "$cmd" >/dev/null 2>&1 || err "'$cmd' not found. Install it before continuing."
done

if [[ "$SKIP_NPM" == false ]]; then
  command -v npm >/dev/null 2>&1 || err "'npm' not found. Install it before continuing."
fi
ok "Host dependencies are available"

## Flathub runtime preparation
ensure_flathub_runtime

## Node/Electron build preparation
if [[ "$SKIP_NPM" == false ]]; then
  build_electron_output
else
  warn "Skipping npm install + npm run dist (--skip-npm)"
fi

## Build output checks
ensure_linux_unpacked

## Local install/reinstall (direct install path)
install_flatpak_direct

## Post-install instructions
cat <<'POSTINSTALL'

Run commands:
  flatpak run com.canva.WebApp
  CANVA_DEBUG=1 flatpak run com.canva.WebApp
  CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp
  CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp
  CANVA_FORCE_X11=1 flatpak run com.canva.WebApp

Optional bundle generation (for release artifacts only):
  ./scripts/build-flatpak-bundle.sh
POSTINSTALL
