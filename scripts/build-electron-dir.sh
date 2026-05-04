#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/preflight-common.sh"

require_cmd node
require_cmd npm

cd "${REPO_ROOT}"

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run dist

if [[ ! -d dist/linux-unpacked ]]; then
  echo "[error] dist/linux-unpacked was not generated" >&2
  exit 1
fi

echo "[ok] Electron dir build available at dist/linux-unpacked"
