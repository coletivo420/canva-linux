#!/usr/bin/env bash
set -euo pipefail
# Keep this wrapper formatted as real multiline shell; the shebang must stay alone.
main() {
  if [[ $# -lt 1 ]]; then
    printf '%s\n' "usage: scripts/run-core-entry.sh <entry-name> [args...]" >&2
    exit 64
  fi

  local ENTRY
  ENTRY="$1"
  shift

  local ROOT_DIR
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  local TARGET
  TARGET="${ROOT_DIR}/.build/scripts/core/${ENTRY}.js"
  if [[ ! -f "${TARGET}" ]]; then
    npm --prefix "${ROOT_DIR}" run build:scripts-core --silent
  fi

  node "${TARGET}" "$@"
}

main "$@"
