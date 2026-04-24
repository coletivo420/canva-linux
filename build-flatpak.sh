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
  ./build-flatpak.sh --install [--skip-npm]
  ./build-flatpak.sh --bundle [--rebuild-repo]

Default behavior:
  --install (local Flatpak build + install)

Compatibility:
  --skip-npm is forwarded to scripts/install-flatpak-local.sh
USAGE
}

## Compatibility routing
if [[ $# -eq 0 ]]; then
  exec "$INSTALL_SCRIPT"
fi

case "$1" in
  --install)
    shift
    exec "$INSTALL_SCRIPT" "$@"
    ;;
  --bundle)
    shift
    exec "$BUNDLE_SCRIPT" "$@"
    ;;
  --skip-npm)
    exec "$INSTALL_SCRIPT" --skip-npm
    ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage
    exit 1
    ;;
esac
