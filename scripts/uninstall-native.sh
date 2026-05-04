#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"

MODE="${1:-scope}"
if [[ "${MODE}" == "all" ]]; then
  CANVA_NATIVE_SCOPE=system NATIVE_SCOPE=system uninstall_native_scope || true
  CANVA_NATIVE_SCOPE=user NATIVE_SCOPE=user uninstall_native_scope || true
else
  validate_native_scope
  uninstall_native_scope
fi

echo "[ok] Native uninstall complete"
