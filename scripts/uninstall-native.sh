#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"

MODE="${1:-scope}"
PURGE_DATA="${2:-}"
if [[ "${MODE}" == "all" ]]; then
  NATIVE_SCOPE=system uninstall_native_scope || true
  NATIVE_SCOPE=user uninstall_native_scope || true
else
  validate_native_scope
  uninstall_native_scope
fi

if [[ "${PURGE_DATA}" == "--purge-data" ]]; then
  cleanup_native_user_data
  echo "[ok] Native user data removed"
fi

echo "[ok] Native uninstall complete"
