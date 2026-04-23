#!/bin/bash
# build-flatpak.sh - Build and install the Canva Flatpak locally.
# Usage: ./build-flatpak.sh [--skip-npm]
set -euo pipefail

RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
NC='[0m'

info()  { echo -e "${YELLOW}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}  $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_VERSION="$(node -p "require('./package.json').version")"

SKIP_NPM=false
for arg in "$@"; do
  [[ "$arg" == "--skip-npm" ]] && SKIP_NPM=true
done

info "Building Canva WebApp v${APP_VERSION}"
info "Checking host dependencies..."
for cmd in flatpak flatpak-builder npm node realpath; do
  command -v "$cmd" >/dev/null 2>&1 || err "'$cmd' not found. Install it before continuing."
done
ok "Dependencies OK"

info "Ensuring Flathub remote..."
flatpak remote-add --if-not-exists --user flathub   https://dl.flathub.org/repo/flathub.flatpakrepo

info "Installing runtimes (this may take a while the first time)..."
flatpak install -y --user flathub   org.freedesktop.Platform//25.08   org.freedesktop.Sdk//25.08   org.electronjs.Electron2.BaseApp//25.08
ok "Runtimes OK"

if [[ "$SKIP_NPM" == false ]]; then
  info "Installing npm dependencies..."
  npm install

  info "Building Electron app (target: dir)..."
  npm run dist
else
  info "Skipping npm step (--skip-npm)"
fi

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

info "Cleaning previous artifacts..."
rm -rf build-dir repo

info "Building Flatpak..."
flatpak-builder   --force-clean   --user   --install-deps-from=flathub   --repo=repo   build-dir   com.canva.WebApp.yml

info "Generating summary for local repository..."
flatpak build-update-repo --generate-static-deltas repo

info "Recreating local remote 'canva-webapp-repo'..."
flatpak --user remote-delete canva-webapp-repo 2>/dev/null || true
flatpak --user remote-add --no-gpg-verify canva-webapp-repo "file://$(realpath repo)"

info "Installing/updating the application..."
flatpak --user install -y --reinstall canva-webapp-repo com.canva.WebApp

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
echo "  CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp"
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
