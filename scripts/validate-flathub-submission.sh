#!/bin/bash
set -euo pipefail

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
MANIFEST_PATH="packaging/flathub/manifest.yml"
GENERATED_SOURCES_PATH="packaging/flathub/generated-sources.json"
SUBMISSION_REPO_DIR="repo"

cd "${REPO_ROOT}"

ARCHIVE_URL="$(node - <<'NODE'
const fs = require('node:fs');
const manifest = fs.readFileSync('packaging/flathub/manifest.yml', 'utf8');
const match = manifest.match(/url:\s*(\S+)/);
if (!match) {
  console.error('Unable to find archive url in packaging/flathub/manifest.yml');
  process.exit(1);
}
console.log(match[1]);
NODE
)"
ARCHIVE_SHA256="$(node - <<'NODE'
const fs = require('node:fs');
const manifest = fs.readFileSync('packaging/flathub/manifest.yml', 'utf8');
const match = manifest.match(/sha256:\s*([a-fA-F0-9]{64})/);
if (!match) {
  console.error('Unable to find sha256 in packaging/flathub/manifest.yml');
  process.exit(1);
}
console.log(match[1].toLowerCase());
NODE
)"

## General local validation (fast checks, no Flatpak runtime required)
for script in \
  scripts/validate-flathub-submission.sh \
  scripts/prepare-flathub-submission.sh \
  packaging/flathub/scripts/generate-npm-sources.sh; do
  info "Checking ${script} syntax"
  bash -n "${script}"
  ok "${script} syntax OK"
done

[[ -f "${MANIFEST_PATH}" ]] || err "Missing submission manifest: ${MANIFEST_PATH}"
[[ -f "${GENERATED_SOURCES_PATH}" ]] || err "Missing npm dependency manifest: ${GENERATED_SOURCES_PATH}"
ok "Required submission files found"

node - <<'NODE'
const fs = require('node:fs');

const manifest = fs.readFileSync('packaging/flathub/manifest.yml', 'utf8');
const required = [
  'runtime: org.freedesktop.Platform',
  'sdk: org.freedesktop.Sdk',
  'base: org.electronjs.Electron2.BaseApp',
  'command: run.sh',
  'type: archive',
  'sha256:',
  'npm install --offline',
  'generated-sources.json',
];

for (const token of required) {
  if (!manifest.includes(token)) {
    console.error(`Missing required manifest token: ${token}`);
    process.exit(1);
  }
}

if (manifest.includes('type: dir')) {
  console.error('Submission manifest must not use type: dir');
  process.exit(1);
}

const generated = JSON.parse(fs.readFileSync('packaging/flathub/generated-sources.json', 'utf8'));
if (!generated || typeof generated !== 'object') {
  console.error('generated-sources.json is not a valid module object');
  process.exit(1);
}

if (!Array.isArray(generated.sources) || generated.sources.length === 0) {
  console.error('generated-sources.json has no npm sources');
  process.exit(1);
}

const hasNpmRegistrySource = generated.sources.some((entry) =>
  typeof entry.url === 'string' && entry.url.includes('registry.npmjs.org')
);

if (!hasNpmRegistrySource) {
  console.error('generated-sources.json does not contain npm registry sources');
  process.exit(1);
}

console.log(`generated-sources.json contains ${generated.sources.length} sources.`);
NODE
ok "Manifest/source structure checks passed"

## Submission-path validation (Flathub-oriented checks via org.flatpak.Builder)
if command -v flatpak >/dev/null 2>&1; then
  if flatpak info org.flatpak.Builder >/dev/null 2>&1 || flatpak --user info org.flatpak.Builder >/dev/null 2>&1; then
    info "Cleaning previous submission repo output (${SUBMISSION_REPO_DIR}/)"
    rm -rf "${SUBMISSION_REPO_DIR}"

    info "Running Flathub-style build check (flathub-build)"
    flatpak run --command=flathub-build org.flatpak.Builder --repo="${SUBMISSION_REPO_DIR}" "${MANIFEST_PATH}"
    ok "flathub-build completed"

    info "Running flatpak-builder-lint manifest on submission manifest"
    flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest "${MANIFEST_PATH}"
    ok "flatpak-builder-lint manifest passed"

    info "Preparing pinned source archive for AppStream validation"
    APPSTREAM_TMP_DIR="$(mktemp -d "${REPO_ROOT}/.tmp-appstream-src.XXXXXX")"
    cleanup_appstream_tmp() {
      rm -rf "${APPSTREAM_TMP_DIR}"
    }
    trap cleanup_appstream_tmp EXIT

    ARCHIVE_PATH="${APPSTREAM_TMP_DIR}/source.tar.gz"
    curl -L --fail --silent --show-error "${ARCHIVE_URL}" -o "${ARCHIVE_PATH}"
    echo "${ARCHIVE_SHA256}  ${ARCHIVE_PATH}" | sha256sum -c >/dev/null

    tar -xzf "${ARCHIVE_PATH}" -C "${APPSTREAM_TMP_DIR}"
    SOURCE_TREE="$(find "${APPSTREAM_TMP_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n1)"
    [[ -n "${SOURCE_TREE}" ]] || err "Unable to determine extracted source directory"

    METAINFO_PATH="${SOURCE_TREE}/data/com.canva.WebApp.metainfo.xml"
    [[ -f "${METAINFO_PATH}" ]] || err "Metainfo file not found in pinned source archive"

    info "Running AppStream metainfo validation (warnings/errors treated as fatal)"
    flatpak run --filesystem="${APPSTREAM_TMP_DIR}:ro" --command=appstreamcli org.flatpak.Builder validate --pedantic --no-net "${METAINFO_PATH}"
    ok "AppStream metainfo validation passed"

    cleanup_appstream_tmp
    trap - EXIT

    if [[ -d "${SUBMISSION_REPO_DIR}" ]]; then
      info "Running flatpak-builder-lint repo ${SUBMISSION_REPO_DIR}"
      flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo "${SUBMISSION_REPO_DIR}"
      ok "flatpak-builder-lint repo passed"
    else
      err "Expected ${SUBMISSION_REPO_DIR}/ after flathub-build, but it was not created"
    fi
  else
    warn "org.flatpak.Builder not installed; skipping flathub-build and lint checks"
  fi
else
  warn "flatpak command not found; skipping flathub-build and lint checks"
fi

ok "Flathub submission validation completed"
