#!/bin/bash
# scripts/validate-flatpak.sh - Local Flatpak validation helper.
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
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

## Version checks
VERSION="$(node -p "require('./package.json').version")"
BUNDLE_PATH="dist/canva-webapp-linux-${VERSION}.flatpak"
info "Validating Flatpak workflow for version ${VERSION}"
ok "Package version detected: ${VERSION}"

## Script syntax checks
info "Checking build-flatpak.sh syntax"
bash -n build-flatpak.sh
ok "build-flatpak.sh syntax OK"

## Flatpak install status
if command -v flatpak >/dev/null 2>&1; then
  if flatpak --user info com.canva.WebApp >/dev/null 2>&1 || flatpak info com.canva.WebApp >/dev/null 2>&1; then
    ok "com.canva.WebApp is installed"
  else
    warn "com.canva.WebApp is not installed locally"
  fi
else
  warn "flatpak command not found; install checks skipped"
fi

## Metadata validation (optional tools)
if command -v appstreamcli >/dev/null 2>&1; then
  info "Running appstreamcli validation"
  appstreamcli validate data/com.canva.WebApp.metainfo.xml
  ok "AppStream metadata validation passed"
else
  warn "appstreamcli not found; skipping metadata validation"
fi

if command -v flatpak-builder-lint >/dev/null 2>&1; then
  info "Running flatpak-builder-lint manifest"
  flatpak-builder-lint manifest com.canva.WebApp.yml
  ok "Manifest lint passed"
else
  warn "flatpak-builder-lint not found; skipping manifest lint"
fi

## Bundle presence check
if [[ -f "$BUNDLE_PATH" ]]; then
  ok "Bundle found: $BUNDLE_PATH"
else
  warn "Bundle not found yet: $BUNDLE_PATH"
  warn "Run ./build-flatpak.sh to generate the Flatpak bundle"
fi

ok "Validation helper completed"
