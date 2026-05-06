#!/usr/bin/env bash
set -euo pipefail

main() {
  if [[ $# -lt 1 ]]; then
    printf '%s\n' "usage: scripts/run-core-entry.sh <entry-name> [args...]" >&2
    exit 64
  fi

  local entry="$1"
  shift

  local root_dir
  root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  local target="${root_dir}/.build/scripts/core/${entry}.js"
  if [[ ! -f "${target}" ]]; then
    npm --prefix "${root_dir}" run build:scripts-core --silent
  fi

  node "${target}" "$@"
}

main "$@"
