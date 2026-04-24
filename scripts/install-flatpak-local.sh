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
info "Preparing local Flatpak install for Canva WebApp v${VERSION}"

## Dependency checks
for cmd in flatpak flatpak-builder npm node realpath; do
  command -v "$cmd" >/dev/null 2>&1 || err "'$cmd' not found. Install it before continuing."
done
ok "Host dependencies are available"

## Flathub runtime preparation
info "Ensuring Flathub remote is configured"
flatpak remote-add --if-not-exists --user flathub \
  https://dl.flathub.org/repo/flathub.flatpakrepo

info "Ensuring required Flatpak runtimes are installed"
flatpak install -y --user flathub \
  org.freedesktop.Platform//25.08 \
  org.freedesktop.Sdk//25.08 \
  org.electronjs.Electron2.BaseApp//25.08
ok "Flatpak runtimes are ready"

## Node/Electron build preparation
if [[ ! -d node_modules ]]; then
  info "node_modules missing; running npm install"
  npm install
else
  info "node_modules found; skipping npm install"
fi

info "Building Electron app (target: dir)"
npm run dist

## Build output checks
UNPACKED_DIR="$(find dist -maxdepth 1 -type d -name 'linux-unpacked' 2>/dev/null | head -1)"
if [[ -z "$UNPACKED_DIR" ]]; then
  UNPACKED_DIR="$(find dist -maxdepth 1 -type d -name 'linux*unpacked' 2>/dev/null | head -1)"
fi
[[ -z "$UNPACKED_DIR" ]] && err "Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?"

if [[ "$UNPACKED_DIR" != "dist/linux-unpacked" ]]; then
  info "Creating symlink dist/linux-unpacked -> $UNPACKED_DIR"
  ln -sfn "$(basename "$UNPACKED_DIR")" dist/linux-unpacked
fi
ok "Electron build output ready: $UNPACKED_DIR"

## Flatpak repository generation
info "Cleaning previous Flatpak build artifacts"
rm -rf build-dir repo

info "Building Flatpak repository"
flatpak-builder \
  --force-clean \
  --user \
  --install-deps-from=flathub \
  --repo=repo \
  build-dir \
  com.canva.WebApp.yml

info "Generating repository summary"
flatpak build-update-repo --generate-static-deltas repo

## Local install/reinstall
info "Refreshing local Flatpak remote 'canva-webapp-repo'"
flatpak --user remote-delete canva-webapp-repo 2>/dev/null || true
flatpak --user remote-add --no-gpg-verify canva-webapp-repo "file://$(realpath repo)"

info "Installing/updating com.canva.WebApp locally"
flatpak --user install -y --reinstall canva-webapp-repo com.canva.WebApp
ok "Local Flatpak install complete"

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
