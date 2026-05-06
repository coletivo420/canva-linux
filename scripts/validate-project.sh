#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "${ROOT_DIR}/scripts/preflight-common.sh"

require_command bash
require_command git
require_command npm
require_command node
require_node_major 22
validate_package_version_semver
validate_json_file package.json
validate_json_file package-lock.json
ensure_npm_dependencies

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

# Validation remains source-first. Do not move runtime build before lint,
# typecheck, tests, docs checks, or AI/Flatpak guardrails.
run_step "npm run lint" npm run lint
run_step "npm run typecheck" npm run typecheck
run_step "npm run typecheck:strict" npm run typecheck:strict
run_step "npm test" npm test
run_step "npm run docs:check-links" npm run docs:check-links
run_step "npm run docs:check-ai" npm run docs:check-ai
run_step "npm run deps:check-policy" npm run deps:check-policy
run_step "./scripts/check-flatpak-scope-policy.sh" ./scripts/check-flatpak-scope-policy.sh
run_step "bash scripts/check-shell-ui-api.sh" bash scripts/check-shell-ui-api.sh
run_step "scripts/run-core-entry.sh check-no-shell-menu" scripts/run-core-entry.sh check-no-shell-menu
run_step "scripts/run-core-entry.sh check-sudo-contract" scripts/run-core-entry.sh check-sudo-contract
run_step "scripts/run-core-entry.sh check-action-contract" scripts/run-core-entry.sh check-action-contract
run_step "npm run check:scripts-core" npm run check:scripts-core
run_step "npm run build:runtime" npm run build:runtime
run_step "npm run build:check" npm run build:check

if command -v desktop-file-validate >/dev/null 2>&1; then
  run_step "desktop-file-validate" desktop-file-validate data/io.github.coletivo420.canva-linux.desktop
else
  log_info "desktop-file-validate not found, skipping"
fi

if command -v appstreamcli >/dev/null 2>&1; then
  run_step "appstreamcli validate --explain" \
    appstreamcli validate --explain \
    data/io.github.coletivo420.canva-linux.metainfo.xml
else
  log_info "appstreamcli not found, skipping"
fi

run_step "./scripts/validate-flatpak.sh" ./scripts/validate-flatpak.sh
run_step "./scripts/validate-flathub-submission.sh" ./scripts/validate-flathub-submission.sh
run_step "git diff --check" git diff --check

log_ok "Project validation completed"
