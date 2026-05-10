#!/usr/bin/env bash
# scripts/preflight-common.sh - Repository-check-only helpers for host tooling.

require_command() {
  local cmd="$1"
  local message="${2:-[error] '$cmd' not found. Install it before continuing.}"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}


validate_json_file() {
  local file="$1"

  require_command node

  if [[ ! -f "$file" ]]; then
    echo "[error] JSON file not found: $file" >&2
    exit 1
  fi

  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file" >/dev/null 2>&1 || {
    echo "[error] Invalid JSON file: $file" >&2
    echo "[error] Fix JSON syntax before continuing." >&2
    exit 1
  }
}

validate_package_scripts() {
  validate_json_file package.json

  node <<'NODE'
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const failures = [];

for (const [name, command] of Object.entries(scripts)) {
  if (typeof command !== 'string') {
    failures.push(`scripts.${name} must be a string`);
    continue;
  }

  if (/\r|\n/.test(command)) {
    failures.push(`scripts.${name} must stay on one line`);
  }
}

if (failures.length > 0) {
  console.error('[error] package.json contains invalid npm scripts:');
  for (const failure of failures) console.error(`[error] - ${failure}`);
  process.exit(1);
}
NODE
}

detect_package_version() {
  if command -v node >/dev/null 2>&1 && [[ -f package.json ]]; then
    validate_json_file package.json
    node -p "require('./package.json').version"
  else
    printf 'unknown'
  fi
}

validate_package_version_semver() {
  validate_json_file package.json

  local version
  version="$(node -p "require('./package.json').version")"

  node - "$version" <<'NODE'
const version = process.argv[2];
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

if (!semverPattern.test(version)) {
  console.error(`[error] package.json version is not valid SemVer: ${version}`);
  console.error('[error] Use a SemVer-compatible package version, for example: 0.1.4-dev.11.29');
  process.exit(1);
}
NODE
}
