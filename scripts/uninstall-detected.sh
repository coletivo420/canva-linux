#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/install-detection-common.sh"
ui_init
detect_installations
print_detected_installations
if ! has_detected_installed_variants; then
  ui_info "No Native or Flatpak installations detected."
  ui_info "AppImage artifacts are generated package files and are removed by --clean."
  exit 0
fi
bash "${ROOT_DIR}/scripts/uninstall-native.sh" all
bash "${ROOT_DIR}/scripts/uninstall-flatpak.sh"
