#!/usr/bin/env bash
set -euo pipefail
# Keep this validation script multiline: prose must stay commented and each run_step must stay on its own line.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "${ROOT_DIR}/scripts/preflight-common.sh"

require_command bash
require_command git
require_command npm
require_command node
validate_package_version_semver
validate_json_file package.json
validate_json_file package-lock.json

# During committed artifact validation, pin CANVA_LINUX_BUILD_REVISION from
# config/canva-linux/build-metadata.json before any build:metadata run. This
# prevents gates from trying to write the current, not-yet-materialized commit
# hash while validating already-committed artifacts.
if [[ -z "${CANVA_LINUX_BUILD_REVISION:-}" && -f config/canva-linux/build-metadata.json ]]; then
  CANVA_LINUX_BUILD_REVISION="$(node -e 'process.stdout.write(String(require("./config/canva-linux/build-metadata.json").buildRevision || ""))')"
  export CANVA_LINUX_BUILD_REVISION
fi

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

# Validation is check-only. Do not regenerate metadata or bootstrap artifacts here.
run_step "npm run lint" npm run lint
run_step "npm test" npm test
run_step "npm run docs:check-ai" npm run docs:check-ai
run_step "npm run docs:check-links" npm run docs:check-links
run_step "npm run deps:check-policy" npm run deps:check-policy
run_step "npm run check:c420ui-node-check" npm run check:c420ui-node-check
run_step "npm run check:c420ui-bootstrap-artifacts" npm run check:c420ui-bootstrap-artifacts
run_step "npm run check:c420ui-bootstrap" npm run check:c420ui-bootstrap
run_step "npm run check:canva-linux" npm run check:canva-linux
run_step "check flatpak scope policy" bash scripts/check-flatpak-scope-policy.sh
run_step "check shell ui api" bash scripts/check-shell-ui-api.sh
run_step "npm run typecheck" npm run typecheck
run_step "npm run typecheck:strict" npm run typecheck:strict
run_step "git diff --exit-code" git diff --exit-code

if command -v desktop-file-validate > /dev/null 2>&1; then
  run_step "desktop-file-validate" desktop-file-validate packages/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop
else
  log_info "desktop-file-validate not found, skipping"
fi

if command -v appstreamcli > /dev/null 2>&1; then
  run_step "appstreamcli validate --explain --no-net" \
    appstreamcli validate --explain --no-net \
    --override releases-not-in-order=info \
    packages/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml
else
  log_info "appstreamcli not found, skipping"
fi

log_ok "Project validation completed"
