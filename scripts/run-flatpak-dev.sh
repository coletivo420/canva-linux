#!/bin/bash
# scripts/run-flatpak-dev.sh - Build and run Canva Flatpak from build-dir without installing.
set -euo pipefail

## Console helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${YELLOW}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}  $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

## Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/flatpak-build-common.sh"

## Dependency checks
require_command flatpak
require_command flatpak-builder
require_command npm
require_command node
require_node_major 22

VERSION="$(detect_package_version)"
info "Preparing Flatpak dev run for Canva Linux v${VERSION}"
info "Flatpak dependency scope: ${FLATPAK_SCOPE}"
ok "Host dependencies are available"

ensure_flathub_runtime
build_electron_output
ensure_linux_unpacked
run_flatpak_dev
