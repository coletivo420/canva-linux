#!/usr/bin/env bash
# scripts/preflight-common.sh - Shared preflight checks for host tooling.

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

require_node_major() {
  local min_major="${1:-22}"

  require_command node "[error] 'node' not found. Canva Linux development workflows require Node.js >=${min_major}."

  local current_major
  current_major="$(node -p "Number(process.versions.node.split('.')[0])")"

  if (( current_major < min_major )); then
    echo "[error] Node.js >=${min_major} is required. Current version: $(node -v)" >&2
    exit 1
  fi
}

detect_package_version() {
  if command -v node >/dev/null 2>&1 && [[ -f package.json ]]; then
    validate_json_file package.json
    node -p "require('./package.json').version"
  else
    printf 'unknown'
  fi
}
