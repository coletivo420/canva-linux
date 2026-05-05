#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/sudo-common.sh"
source "${ROOT_DIR}/scripts/install-detection-common.sh"
ui_init

SCOPE="${CANVA_FLATPAK_SCOPE:-all}"
command -v flatpak >/dev/null 2>&1 || { ui_info "Flatpak command not available; nothing to uninstall"; exit 0; }
flatpak kill "$APP_ID" 2>/dev/null || true

detect_installations

case "$SCOPE" in
  system)
    if [[ "${DETECTED_FLATPAK_SYSTEM}" == true ]]; then
      canva_sudo_flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true
      ui_ok "Flatpak system uninstall complete"
    else
      ui_info "No Flatpak system install detected"
    fi
    ;;
  user)
    if [[ "${DETECTED_FLATPAK_USER}" == true ]]; then
      flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
      ui_ok "Flatpak user uninstall complete"
    else
      ui_info "No Flatpak user install detected"
    fi
    ;;
  all|"")
    if [[ "${DETECTED_FLATPAK_USER}" == true ]]; then
      flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
      ui_ok "Flatpak user uninstall complete"
    else
      ui_info "No Flatpak user install detected"
    fi
    if [[ "${DETECTED_FLATPAK_SYSTEM}" == true ]]; then
      canva_sudo_flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true
      ui_ok "Flatpak system uninstall complete"
    else
      ui_info "No Flatpak system install detected"
    fi
    ;;
  *)
    ui_error "Invalid CANVA_FLATPAK_SCOPE: ${SCOPE} (expected: user, system, all)"
    exit 1
    ;;
esac

detect_installations
print_detected_installations_compact
