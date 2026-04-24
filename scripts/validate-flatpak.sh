#!/bin/bash
# scripts/validate-flatpak.sh - Local Flatpak and Flathub-readiness validation helper.
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

## Flags
CHECK_RELEASE_ARTIFACTS=false
if [[ "${1:-}" == "--release-artifacts" ]]; then
  CHECK_RELEASE_ARTIFACTS=true
elif [[ -n "${1:-}" ]]; then
  err "Unknown argument: ${1}. Supported: --release-artifacts"
fi

## Version checks
VERSION="$(node -p "require('./package.json').version")"
BUNDLE_PATH="dist/canva-webapp-linux-${VERSION}.flatpak"
info "Validating Flatpak workflow for version ${VERSION}"
ok "Package version detected: ${VERSION}"

## Script syntax checks
for script in \
  canva-linux.sh \
  scripts/install-flatpak-local.sh \
  scripts/build-flatpak-bundle.sh \
  scripts/validate-flatpak.sh; do
  info "Checking ${script} syntax"
  bash -n "$script"
  ok "${script} syntax OK"
done

## Flatpak install status
if command -v flatpak >/dev/null 2>&1; then
  if flatpak --user info com.canva.WebApp >/dev/null 2>&1 || flatpak info com.canva.WebApp >/dev/null 2>&1; then
    ok "com.canva.WebApp is installed"
  else
    warn "com.canva.WebApp is not installed locally"
  fi
else
  warn "flatpak command not found; Flatpak-based checks skipped"
fi

## Optional desktop file validation
if command -v desktop-file-validate >/dev/null 2>&1; then
  info "Running desktop-file-validate"
  desktop-file-validate data/com.canva.WebApp.desktop
  ok "Desktop entry validation passed"
else
  warn "desktop-file-validate not found; skipping desktop entry validation"
fi

## Optional AppStream validation
if command -v appstreamcli >/dev/null 2>&1; then
  info "Running appstreamcli validate --explain"
  appstreamcli validate --explain data/com.canva.WebApp.metainfo.xml
  ok "AppStream metadata validation passed"
else
  warn "appstreamcli not found; skipping AppStream metadata validation"
fi

## Optional Flathub-style lint checks
if command -v flatpak >/dev/null 2>&1; then
  if flatpak info org.flatpak.Builder >/dev/null 2>&1 || flatpak --user info org.flatpak.Builder >/dev/null 2>&1; then
    info "Running Flatpak builder lint for manifest"
    flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml
    ok "Manifest lint passed"

    if [[ -d repo ]]; then
      info "Running Flatpak builder lint for repo/"
      flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
      ok "Repository lint passed"
    else
      warn "repo/ directory not found; skipping repository lint"
    fi
  else
    warn "org.flatpak.Builder is not installed; skipping flatpak-builder-lint checks"
  fi
else
  warn "flatpak command not found; skipping flatpak-builder-lint checks"
fi

## Permission documentation presence check
if [[ -f docs/FLATPAK_PERMISSIONS.md ]]; then
  ok "Permission review doc found: docs/FLATPAK_PERMISSIONS.md"
else
  err "Missing required permission review doc: docs/FLATPAK_PERMISSIONS.md"
fi

## Optional bundle presence check
if [[ "$CHECK_RELEASE_ARTIFACTS" == true ]]; then
  if [[ -f "$BUNDLE_PATH" ]]; then
    ok "Bundle found: $BUNDLE_PATH"
  else
    err "Bundle not found: $BUNDLE_PATH"
  fi
else
  if [[ -f "$BUNDLE_PATH" ]]; then
    ok "Bundle found: $BUNDLE_PATH"
  else
    warn "Bundle not found (expected for local install workflow): $BUNDLE_PATH"
    warn "Run ./scripts/build-flatpak-bundle.sh when preparing release artifacts"
  fi
fi

ok "Validation helper completed"
