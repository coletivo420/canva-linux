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

## Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

source "${SCRIPT_DIR}/preflight-common.sh"
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

## Dependency checks
require_command flatpak
require_command flatpak-builder

if [[ "$SKIP_NPM" == false ]]; then
  require_command npm
  require_node_major 22
fi

VERSION="$(detect_package_version)"
info "Preparing local Flatpak install for Canva Linux v${VERSION}"
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
  flatpak run io.github.PirateMaryRead.canva-linux
  CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
  CANVA_DEBUG=oauth,dnd flatpak run io.github.PirateMaryRead.canva-linux
  CANVA_FORCE_WAYLAND=1 flatpak run io.github.PirateMaryRead.canva-linux
  CANVA_FORCE_X11=1 flatpak run io.github.PirateMaryRead.canva-linux

Optional bundle generation (for release artifacts only):
  ./scripts/build-flatpak-bundle.sh
POSTINSTALL
