#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/user-data-common.sh"
ui_init
bash "${ROOT_DIR}/scripts/uninstall-detected.sh" || true
cleanup_all_user_data
ui_ok "User data removed for Flatpak and Native paths"
