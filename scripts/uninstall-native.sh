#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"
MODE="${1:-scope}"
PURGE_DATA="${2:-}"
case "$MODE" in
  all)
    uninstall_native_system || true
    uninstall_native_user || true
    ;;
  scope)
    validate_native_scope
    resolve_native_paths
    uninstall_native_scope
    ;;
  *)
    echo "[error] Unknown mode: $MODE" >&2
    exit 1
    ;;
esac
if [[ "${PURGE_DATA}" == "--purge-data" ]]; then cleanup_native_user_data; echo "[ok] Native user data removed"; fi
echo "[ok] Native uninstall complete"
