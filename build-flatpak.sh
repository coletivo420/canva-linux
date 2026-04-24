#!/usr/bin/env bash
# build-flatpak.sh - Deprecated compatibility wrapper for legacy Flatpak workflows.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CANONICAL_SCRIPT="${SCRIPT_DIR}/canva-linux.sh"
INSTALL_SCRIPT="${SCRIPT_DIR}/scripts/install-flatpak-local.sh"
BUNDLE_SCRIPT="${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh"

usage() {
  cat <<'USAGE'
Usage:
  ./build-flatpak.sh
  ./build-flatpak.sh --install [--skip-npm]
  ./build-flatpak.sh --bundle [--rebuild-repo]
  ./build-flatpak.sh --validate
  ./build-flatpak.sh --uninstall [--reset-user-data]

Default behavior:
  --install (local Flatpak build + install)

Compatibility:
  --skip-npm is forwarded to scripts/install-flatpak-local.sh
  --rebuild-repo is forwarded to scripts/build-flatpak-bundle.sh
USAGE
}

warn_deprecated() {
  echo "[warn] build-flatpak.sh is deprecated. Use ./canva-linux.sh instead." >&2
}

# Preserve legacy behavior: no arguments performs local install.
if [[ $# -eq 0 ]]; then
  warn_deprecated
  exec "$INSTALL_SCRIPT"
fi

legacy_mode=false
for arg in "$@"; do
  case "$arg" in
    --install|--bundle|--skip-npm|--rebuild-repo)
      legacy_mode=true
      ;;
  esac
done

if [[ "$legacy_mode" == true ]]; then
  warn_deprecated

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
      shift
      exec "$INSTALL_SCRIPT" --skip-npm "$@"
      ;;
    --rebuild-repo)
      shift
      exec "$BUNDLE_SCRIPT" --rebuild-repo "$@"
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
fi

# For non-legacy actions, forward to canonical workflow script.
warn_deprecated
exec "$CANONICAL_SCRIPT" "$@"
