#!/bin/bash
# build-flatpak.sh - Compatibility wrapper for Flatpak install and bundle workflows.
set -euo pipefail

## Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_SCRIPT="${SCRIPT_DIR}/scripts/install-flatpak-local.sh"
BUNDLE_SCRIPT="${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh"

## Usage helper
usage() {
  cat <<'USAGE'
Usage:
  ./build-flatpak.sh
  ./build-flatpak.sh --install
  ./build-flatpak.sh --bundle

Default behavior:
  --install (local Flatpak build + install)
USAGE
}

## Compatibility routing
case "${1:-}" in
  "")
    exec "$INSTALL_SCRIPT"
    ;;
  --install)
    exec "$INSTALL_SCRIPT"
    ;;
  --bundle)
    exec "$BUNDLE_SCRIPT"
    ;;
  *)
    usage
    exit 1
    ;;
esac
