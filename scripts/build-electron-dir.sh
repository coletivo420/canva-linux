#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/preflight-common.sh"

require_command node
require_command npm
require_node_major 22
validate_package_version_semver

cd "${REPO_ROOT}"
ensure_npm_dependencies

npm run dist

if [[ ! -d dist/linux-unpacked ]]; then
  echo "[error] dist/linux-unpacked was not generated" >&2
  exit 1
fi

echo "[ok] Electron dir build available at dist/linux-unpacked"
