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

  case "${ENTRY}" in
    overview-status|check-ai-guardrails|check-doc-links|check-dependency-policy|check-runtime-build|check-repository-policy)
      ;;
    action-registry|action-runner|validate-actions|check-legacy-action-runner-compatibility)
      rm -f "${ROOT_DIR}/.build/scripts/core/${ENTRY}.js"
      printf '%s\n' "scripts/run-core-entry.sh: ${ENTRY} was removed; use a supported core entry." >&2
      exit 66
      ;;
    *)
      printf '%s\n' "scripts/run-core-entry.sh: unknown core entry '${ENTRY}'." >&2
      exit 64
      ;;
  esac

  local TARGET
  if [[ "${ENTRY}" == "overview-status" ]]; then
    TARGET="${ROOT_DIR}/.build/scripts/canva-linux/detection/overview-status.js"
    if [[ ! -f "${TARGET}" ]]; then
      npx --prefix "${ROOT_DIR}" esbuild "${ROOT_DIR}/scripts/canva-linux/detection/overview-status.ts" --bundle --platform=node --format=cjs --outfile="${TARGET}" --log-level=warning
    fi
  else
    TARGET="${ROOT_DIR}/.build/scripts/core/${ENTRY}.js"
    if [[ ! -f "${TARGET}" ]]; then
      npm --prefix "${ROOT_DIR}" run build:scripts-core --silent
    fi
  fi

  if [[ ! -f "${TARGET}" ]]; then
    printf '%s\n' "scripts/run-core-entry.sh: failed to build ${TARGET}." >&2
    exit 66
  fi

  node "${TARGET}" "$@"
}

main "$@"
