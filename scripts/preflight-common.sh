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

CANVA_REQUIRED_NPM_DEPS=(
  esbuild
  typescript
  electron
  electron-builder
  eslint
  @typescript-eslint/parser
  @typescript-eslint/eslint-plugin
)

check_npm_dependency() {
  local dep="$1"

  node -e "require.resolve(process.argv[1], { paths: [process.cwd()] })" "$dep" >/dev/null 2>&1
}

ensure_npm_dependencies() {
  require_command node
  require_command npm
  require_node_major 22
  validate_json_file package.json

  if [[ "${CANVA_SKIP_NPM_INSTALL:-0}" == "1" ]]; then
    echo "[info] Skipping npm dependency bootstrap because CANVA_SKIP_NPM_INSTALL=1"
    return 0
  fi

  local missing=0
  if [[ ! -d node_modules ]]; then
    missing=1
  else
    local dep
    for dep in "${CANVA_REQUIRED_NPM_DEPS[@]}"; do
      if ! check_npm_dependency "$dep"; then
        missing=1
        break
      fi
    done
  fi

  local install_cmd=(npm install --include=dev)
  if [[ -f package-lock.json ]]; then
    install_cmd=(npm ci --include=dev)
  fi

  if [[ "${CANVA_NPM_REPAIR:-}" == "clean" ]]; then
    echo "[info] Forcing clean npm dependency repair (CANVA_NPM_REPAIR=clean)"
    "${install_cmd[@]}" || exit 1
    return 0
  fi

  if [[ "$missing" -eq 0 ]]; then
    echo "[ok] npm dependencies are available"
    return 0
  fi

  echo "[info] Installing npm dependencies with ${install_cmd[*]}"
  "${install_cmd[@]}" || exit 1
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
