#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log_info() {
  echo "[info] $*"
}

log_ok() {
  echo "[ok]  $*"
}

run_step() {
  local label="$1"
  shift

  log_info "$label"
  "$@"
  log_ok "$label"
}

run_step "npm run build:preload" npm run build:preload
run_step "npm run lint" npm run lint
run_step "npm run typecheck" npm run typecheck
run_step "npm test" npm test
run_step "npm run docs:check-links" npm run docs:check-links

if command -v desktop-file-validate >/dev/null 2>&1; then
  run_step "desktop-file-validate" desktop-file-validate data/io.github.PirateMaryRead.canva-linux.desktop
else
  log_info "desktop-file-validate not found, skipping"
fi

if command -v appstreamcli >/dev/null 2>&1; then
  run_step "appstreamcli validate --explain" appstreamcli validate --explain data/io.github.PirateMaryRead.canva-linux.metainfo.xml
else
  log_info "appstreamcli not found, skipping"
fi

run_step "./scripts/validate-flatpak.sh" ./scripts/validate-flatpak.sh
run_step "./scripts/validate-flathub-submission.sh" ./scripts/validate-flathub-submission.sh
run_step "git diff --check" git diff --check

log_ok "Project validation completed"
