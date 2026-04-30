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
  ./scripts/build-flatpak-bundle.sh [--use-existing-repo]

Options:
  --use-existing-repo   Reuse repo/ instead of rebuilding it first
USAGE
}

## Flags
USE_EXISTING_REPO=false
for arg in "$@"; do
  case "$arg" in
    --use-existing-repo)
      USE_EXISTING_REPO=true
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
require_command npm
require_command node
require_command realpath
require_command stat
require_node_major 22

VERSION="$(detect_package_version)"
DIST_DIR="dist"
BUNDLE_PATH="${DIST_DIR}/canva-linux-${VERSION}.flatpak"

info "Generating Flatpak bundle for version ${VERSION}"

## Repo helpers
repo_has_app_ref() {
  [[ -d repo/refs ]] && find repo/refs -type f | grep -q '/io\.github\.PirateMaryRead\.canva-linux/'
}

## Ensure valid Flatpak repository exists
if [[ "$USE_EXISTING_REPO" == true ]]; then
  repo_has_app_ref || err "repo/ is missing or does not contain io.github.PirateMaryRead.canva-linux refs"
  info "Using existing repo/ directory by explicit request"
else
  ensure_flathub_runtime
  build_electron_output
  ensure_linux_unpacked
  build_flatpak_repo
fi

## Create distributable bundle
mkdir -p "$DIST_DIR"
flatpak build-bundle repo "$BUNDLE_PATH" io.github.PirateMaryRead.canva-linux \
  --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo

SIZE_BYTES="$(stat -c '%s' "$BUNDLE_PATH")"
ok "Bundle generated: $(realpath "$BUNDLE_PATH")"
ok "Bundle size: ${SIZE_BYTES} bytes"
