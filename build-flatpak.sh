#!/bin/bash
# build-flatpak.sh - Build and install the Canva Flatpak locally.
# Usage: ./build-flatpak.sh [--skip-npm]
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

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

## App metadata
APP_VERSION="$(node -p "require('./package.json').version")"

## Runtime flags
SKIP_NPM=false
for arg in "$@"; do
  [[ "$arg" == "--skip-npm" ]] && SKIP_NPM=true
done

## Dependency checks
info "Building Canva WebApp v${APP_VERSION}"
info "Checking host dependencies..."
for cmd in flatpak flatpak-builder npm node realpath; do
  command -v "$cmd" >/dev/null 2>&1 || err "'$cmd' not found. Install it before continuing."
done
ok "Dependencies OK"

## Flathub runtime preparation
info "Ensuring Flathub remote..."
flatpak remote-add --if-not-exists --user flathub   https://dl.flathub.org/repo/flathub.flatpakrepo

info "Installing runtimes (this may take a while the first time)..."
flatpak install -y --user flathub   org.freedesktop.Platform//25.08   org.freedesktop.Sdk//25.08   org.electronjs.Electron2.BaseApp//25.08
ok "Runtimes OK"

## Electron build preparation
if [[ "$SKIP_NPM" == false ]]; then
  info "Installing npm dependencies..."
  npm install

  info "Building Electron app (target: dir)..."
  npm run dist
else
  info "Skipping npm step (--skip-npm)"
fi

## Build output checks
UNPACKED_DIR=$(find dist -maxdepth 1 -type d -name 'linux-unpacked' 2>/dev/null | head -1)
if [[ -z "$UNPACKED_DIR" ]]; then
  UNPACKED_DIR=$(find dist -maxdepth 1 -type d -name 'linux*unpacked' 2>/dev/null | head -1)
fi
[[ -z "$UNPACKED_DIR" ]] && err "Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?"

if [[ "$UNPACKED_DIR" != "dist/linux-unpacked" ]]; then
  info "Creating symlink dist/linux-unpacked -> $UNPACKED_DIR"
  ln -sfn "$(basename "$UNPACKED_DIR")" dist/linux-unpacked
fi
ok "Electron build OK: $UNPACKED_DIR"

## Flatpak repository generation
info "Cleaning previous artifacts..."
rm -rf build-dir repo

info "Building Flatpak..."
flatpak-builder   --force-clean   --user   --install-deps-from=flathub   --repo=repo   build-dir   com.canva.WebApp.yml

info "Generating summary for local repository..."
flatpak build-update-repo --generate-static-deltas repo

## Bundle export and local installation
DIST_DIR="dist"
BUNDLE_PATH="${DIST_DIR}/canva-webapp-linux-${APP_VERSION}.flatpak"

info "Ensuring bundle output directory exists..."
mkdir -p "$DIST_DIR"

info "Generating Flatpak bundle for GitHub releases..."
flatpak build-bundle repo "$BUNDLE_PATH" com.canva.WebApp --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo

info "Recreating local remote 'canva-webapp-repo'..."
flatpak --user remote-delete canva-webapp-repo 2>/dev/null || true
flatpak --user remote-add --no-gpg-verify canva-webapp-repo "file://$(realpath repo)"

info "Installing/updating the application..."
flatpak --user install -y --reinstall canva-webapp-repo com.canva.WebApp

## Bundle summary
BUNDLE_REALPATH="$(realpath "$BUNDLE_PATH")"
if command -v stat >/dev/null 2>&1; then
  BUNDLE_SIZE="$(stat -c '%s bytes' "$BUNDLE_PATH")"
else
  BUNDLE_SIZE="size unavailable (stat not found)"
  warn "$BUNDLE_SIZE"
fi
ok "Bundle generated: ${BUNDLE_REALPATH} (${BUNDLE_SIZE})"

## Post-install instructions
ok "Installation completed for Canva WebApp v${APP_VERSION}!"
echo ""
echo "Post-install commands:"
echo "  Run:                        flatpak run com.canva.WebApp"
echo "  Run with full app debug:    CANVA_DEBUG=1 flatpak run com.canva.WebApp"
echo "  Force Wayland:              CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp"
echo "  Force X11:                  CANVA_FORCE_X11=1 flatpak run com.canva.WebApp"
echo "  Uninstall:                  flatpak uninstall --user com.canva.WebApp"
echo ""
echo "Run with category filters:"
# Category filters mirror main/preload debug channels for targeted diagnostics.
echo "  CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp"
echo "  CANVA_DEBUG=startup,dnd,upload,permissions,session flatpak run com.canva.WebApp"
echo "  CANVA_DEBUG=startup,tabs,oauth,dnd,upload flatpak run com.canva.WebApp"
echo ""
echo "Startup logs now include release-status lines for corrected, validated, and under-observation items."
echo ""
echo "Expected debug categories:"
echo "  [canva:startup] ..."
echo "  [canva:tabs] ..."
echo "  [canva:view] ..."
echo "  [canva:oauth] ..."
echo "  [canva:dnd] ..."
echo "  [canva:upload] ..."
echo "  [canva:permissions] ..."
echo "  [canva:eyedropper] ..."
