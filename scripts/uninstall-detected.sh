#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/install-detection-common.sh"
ui_init

detect_installations
if ! has_detected_installed_variants; then
  ui_info "No Native or Flatpak installations detected"
  exit 0
fi

if [[ "${DETECTED_NATIVE_SYSTEM}" == true ]]; then CANVA_NATIVE_SCOPE=system bash "${ROOT_DIR}/scripts/uninstall-native.sh" scope; fi
if [[ "${DETECTED_NATIVE_USER}" == true ]]; then CANVA_NATIVE_SCOPE=user bash "${ROOT_DIR}/scripts/uninstall-native.sh" scope; fi
if [[ "${DETECTED_FLATPAK_SYSTEM}" == true ]]; then CANVA_FLATPAK_SCOPE=system bash "${ROOT_DIR}/scripts/uninstall-flatpak.sh"; fi
if [[ "${DETECTED_FLATPAK_USER}" == true ]]; then CANVA_FLATPAK_SCOPE=user bash "${ROOT_DIR}/scripts/uninstall-flatpak.sh"; fi

detect_installations
print_detected_installations_compact
