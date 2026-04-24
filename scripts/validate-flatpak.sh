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

## Documentation presence checks
if [[ -f docs/SCREENSHOTS.md ]]; then
  ok "Screenshot manifest found: docs/SCREENSHOTS.md"
else
  err "Missing required screenshot manifest: docs/SCREENSHOTS.md"
fi

if [[ -f docs/PRIVACY.md ]]; then
  ok "Privacy documentation found: docs/PRIVACY.md"
else
  err "Missing required privacy documentation: docs/PRIVACY.md"
fi

if [[ -f docs/FLATHUB_CHECKLIST.md ]]; then
  ok "Flathub checklist found: docs/FLATHUB_CHECKLIST.md"
else
  err "Missing required Flathub checklist: docs/FLATHUB_CHECKLIST.md"
fi

if [[ -f docs/FLATPAK_PERMISSIONS.md ]]; then
  ok "Permission review doc found: docs/FLATPAK_PERMISSIONS.md"
else
  err "Missing required permission review doc: docs/FLATPAK_PERMISSIONS.md"
fi

## Flatpak install status
if command -v flatpak >/dev/null 2>&1; then
  if flatpak --user info com.canva.WebApp >/dev/null 2>&1 || flatpak info com.canva.WebApp >/dev/null 2>&1; then
    ok "com.canva.WebApp is installed"
  else
    warn "com.canva.WebApp is not installed locally"
  fi
else
  warn "flatpak command not found; Flatpak-based checks skipped"
  warn "Install Flatpak and org.flatpak.Builder to run full Flathub lint checks"
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
    info "Running flatpak-builder-lint manifest"
    flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml
    ok "Manifest lint passed"

    if [[ -d repo ]]; then
      info "Running flatpak-builder-lint repo repo"
      flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
      ok "Repository lint passed"
    else
      warn "repo/ directory not found; skipping flatpak-builder-lint repo repo"
      warn "Run ./canva-linux.sh --bundle to generate repo/ before repo lint"
    fi
  else
    warn "org.flatpak.Builder is not installed; skipping flatpak-builder-lint checks"
    warn "Install with: flatpak install flathub org.flatpak.Builder"
  fi
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
    warn "Run ./canva-linux.sh --bundle when preparing release artifacts"
  fi
fi

ok "Validation helper completed"
