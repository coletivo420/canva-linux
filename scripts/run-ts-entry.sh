#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  printf '%s\n' "usage: scripts/run-ts-entry.sh <entry.ts> [args...]" >&2
  exit 64
fi

ENTRY="$1"
shift
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRY_PATH="${ROOT_DIR}/${ENTRY}"
FLAT_NAME="${ENTRY//\//-}"
OUTFILE="${ROOT_DIR}/.build/scripts/bootstrap/${FLAT_NAME%.ts}.js"

npx esbuild "${ENTRY_PATH}" --bundle --platform=node --target=node20 --format=cjs --external:electron --external:blessed --external:esbuild --outfile="${OUTFILE}" --log-level=warning >/dev/null
CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_SCRIPT_SOURCE_DIR="$(dirname "${ENTRY_PATH}")" node "${OUTFILE}" "$@"
