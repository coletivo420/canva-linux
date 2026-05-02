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

require_file() {
  local file_path="$1"
  local label="$2"

  if [[ -f "${file_path}" ]]; then
    ok "${label} found: ${file_path}"
  else
    err "Missing required ${label}: ${file_path}"
  fi
}

check_optional_command() {
  local cmd="$1"
  local label="$2"

  if command -v "${cmd}" >/dev/null 2>&1; then
    ok "${label} available: ${cmd}"
    return 0
  fi

  warn "${label} not found; skipping related validation"
  return 1
}

repo_lint_has_only_local_screenshot_mirror_findings() {
  local output_path="$1"

  node - "$output_path" <<'NODE'
const fs = require('fs');

const outputPath = process.argv[2];
const allowedErrors = new Set([
  'appstream-external-screenshot-url',
  'appstream-screenshots-not-mirrored-in-ostree',
]);

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
} catch {
  process.exit(1);
}

const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

if (
  errors.length > 0
  && errors.every((item) => allowedErrors.has(item))
  && warnings.length === 0
) {
  process.exit(0);
}

process.exit(1);
NODE
}

## Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

source "${SCRIPT_DIR}/preflight-common.sh"

## Preflight
require_command bash
require_command node
require_command flatpak
require_node_major 22

## Flags
CHECK_RELEASE_ARTIFACTS=false
if [[ "${1:-}" == "--release-artifacts" ]]; then
  CHECK_RELEASE_ARTIFACTS=true
elif [[ -n "${1:-}" ]]; then
  err "Unknown argument: ${1}. Supported: --release-artifacts"
fi

## Version checks
VERSION="$(detect_package_version)"
BUNDLE_PATH="dist/canva-linux-${VERSION}.flatpak"
info "Validating Flatpak workflow for version ${VERSION}"
ok "Package version detected: ${VERSION}"

## Script syntax checks
for script in \
  canva-linux.sh \
  scripts/flatpak-build-common.sh \
  scripts/install-flatpak-local.sh \
  scripts/build-flatpak-bundle.sh \
  scripts/validate-flatpak.sh; do
  info "Checking ${script} syntax"
  bash -n "$script"
  ok "${script} syntax OK"
done

## Required file presence checks
while IFS='|' read -r path label; do
  require_file "${path}" "${label}"
done <<'REQUIRED_FILES'
docs/SCREENSHOTS.md|screenshot manifest
docs/PRIVACY.md|privacy documentation
docs/FLATHUB_CHECKLIST.md|Flathub checklist
docs/FLATHUB_SOURCE.md|Flathub source strategy documentation
docs/FLATPAK_PERMISSIONS.md|permission review documentation
io.github.coletivo420.canva-linux.yml|Flatpak manifest
data/io.github.coletivo420.canva-linux.metainfo.xml|AppStream metadata
data/io.github.coletivo420.canva-linux.desktop|desktop entry metadata
REQUIRED_FILES

## Flatpak permission policy guardrails (dev18)
node - <<'NODE'
const fs = require('node:fs');

const manifests = [
  'io.github.coletivo420.canva-linux.yml',
  'packaging/flathub/manifest.yml',
];

const forbidden = [
  '--filesystem=home',
  '--device=all',
  '--socket=session-bus',
  '--socket=system-bus',
  '--talk-name=org.freedesktop.portal.Desktop',
  '--talk-name=org.freedesktop.ScreenSaver',
];

const required = [
  '--talk-name=org.freedesktop.secrets',
  '--filesystem=xdg-download',
  '--filesystem=xdg-run/pipewire-0',
  '--talk-name=org.freedesktop.FileManager1',
];

const extractFinishArgs = (content) =>
  content
    .split('\n')
    .filter((line) => line.trimStart().startsWith('- --'))
    .map((line) => line.trim().replace(/^- /, '').split(/\s+#/)[0].trim());

const byManifest = new Map();

for (const manifestPath of manifests) {
  const content = fs.readFileSync(manifestPath, 'utf8');
  const finishArgs = extractFinishArgs(content);
  byManifest.set(manifestPath, finishArgs);

  for (const token of forbidden) {
    if (finishArgs.includes(token)) {
      console.error(`${manifestPath}: forbidden permission present: ${token}`);
      process.exit(1);
    }
  }

  for (const token of required) {
    if (!finishArgs.includes(token)) {
      console.error(`${manifestPath}: required permission missing: ${token}`);
      process.exit(1);
    }
  }
}

const [localManifest, submissionManifest] = manifests;
const localSet = new Set(byManifest.get(localManifest));
const submissionSet = new Set(byManifest.get(submissionManifest));

const localOnly = [...localSet].filter((token) => !submissionSet.has(token));
const submissionOnly = [...submissionSet].filter((token) => !localSet.has(token));

if (localOnly.length || submissionOnly.length) {
  console.error('Manifest permission policy mismatch detected.');
  if (localOnly.length) {
    console.error(`${localManifest} only: ${localOnly.join(', ')}`);
  }
  if (submissionOnly.length) {
    console.error(`${submissionManifest} only: ${submissionOnly.join(', ')}`);
  }
  process.exit(1);
}

console.log('Permission guardrails passed for both manifests.');
NODE
ok "Permission guardrails passed (forbidden absent + required present + manifest parity)"

## Branding/app-id guardrails (dev19)
node - <<'NODE'
const fs = require('node:fs');

const checks = [
  ['io.github.coletivo420.canva-linux.yml', 'app-id: io.github.coletivo420.canva-linux'],
  ['packaging/flathub/manifest.yml', 'app-id: io.github.coletivo420.canva-linux'],
  ['data/io.github.coletivo420.canva-linux.desktop', 'Name=Canva Linux'],
  ['data/io.github.coletivo420.canva-linux.desktop', 'Comment=A community opensource desktop wrapper for use with Canva'],
  ['data/io.github.coletivo420.canva-linux.metainfo.xml', '<id>io.github.coletivo420.canva-linux</id>'],
  ['data/io.github.coletivo420.canva-linux.metainfo.xml', '<summary>A community opensource desktop wrapper for use with Canva</summary>'],
];

for (const [filePath, token] of checks) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(token)) {
    console.error(`${filePath}: missing required token: ${token}`);
    process.exit(1);
  }
}

const forbiddenActive = [
  'io.github.PirateMaryRead.canva-linux-NOT-REALLY',
];

const activeFiles = [
  'package.json',
  'electron/main/index.ts',
  'io.github.coletivo420.canva-linux.yml',
  'packaging/flathub/manifest.yml',
  'run.sh',
  'canva-linux.sh',
  'scripts/install-flatpak-local.sh',
  'scripts/build-flatpak-bundle.sh',
  'scripts/flatpak-build-common.sh',
  'scripts/prepare-flathub-submission.sh',
  'data/io.github.coletivo420.canva-linux.desktop',
];

for (const filePath of activeFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const token of forbiddenActive) {
    if (content.includes(token)) {
      console.error(`${filePath}: forbidden legacy token present: ${token}`);
      process.exit(1);
    }
  }
}

console.log('Branding/app-id guardrails passed for active packaging files.');
NODE
ok "Branding/app-id guardrails passed"

## Flatpak install status
if flatpak --user info io.github.coletivo420.canva-linux >/dev/null 2>&1 || flatpak info io.github.coletivo420.canva-linux >/dev/null 2>&1; then
  ok "io.github.coletivo420.canva-linux is installed"
else
  warn "io.github.coletivo420.canva-linux is not installed locally"
fi

## Optional desktop file validation
if check_optional_command desktop-file-validate "Desktop file validator"; then
  info "Running desktop-file-validate"
  desktop-file-validate data/io.github.coletivo420.canva-linux.desktop
  ok "Desktop entry validation passed"
fi

## Optional AppStream validation
if check_optional_command appstreamcli "AppStream validator"; then
  info "Running appstreamcli validate --explain"
  appstreamcli validate --explain data/io.github.coletivo420.canva-linux.metainfo.xml
  ok "AppStream metadata validation passed"
fi

## Optional Flathub-style lint checks
if flatpak info org.flatpak.Builder >/dev/null 2>&1 || flatpak --user info org.flatpak.Builder >/dev/null 2>&1; then
    info "Running flatpak-builder-lint manifest"
    flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest io.github.coletivo420.canva-linux.yml
    ok "Manifest lint passed"

    if [[ -d repo ]]; then
      info "Running flatpak-builder-lint repo repo"
      repo_lint_output="$(mktemp)"
      if flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo >"$repo_lint_output" 2>&1; then
        ok "Repository lint passed"
      else
        if repo_lint_has_only_local_screenshot_mirror_findings "$repo_lint_output"; then
          info "Repository lint only reported local screenshot mirror findings"
          info "Flathub mirrors screenshots to dl.flathub.org/media during submission review"
          ok "Repository lint completed with documented local screenshot mirror limitation"
        else
          cat "$repo_lint_output"
          rm -f "$repo_lint_output"
          exit 1
        fi
      fi
      rm -f "$repo_lint_output"
    else
      warn "repo/ directory not found; skipping flatpak-builder-lint repo repo"
      warn "Run ./canva-linux.sh --bundle to generate repo/ before repo lint"
    fi
else
  warn "org.flatpak.Builder is not installed; skipping flatpak-builder-lint checks"
  warn "Install with: flatpak install flathub org.flatpak.Builder"
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
