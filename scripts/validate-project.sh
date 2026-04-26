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

run_step "npm run lint" npm run lint
run_step "npm test" npm test
run_step "docs:check-links" npm run docs:check-links
run_step "Flatpak validation helper" ./scripts/validate-flatpak.sh
run_step "git diff HEAD --check" git diff HEAD --check

log_ok "Project validation completed"
