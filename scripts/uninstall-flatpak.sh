#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
ui_init

SCOPE="${CANVA_FLATPAK_SCOPE:-all}"
flatpak kill "$APP_ID" 2>/dev/null || true

case "$SCOPE" in
  system)
    sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true
    ui_ok "Flatpak system uninstall complete"
    ;;
  user)
    flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
    ui_ok "Flatpak user uninstall complete"
    ;;
  all|"")
    flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
    sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true
    ui_ok "Flatpak uninstall complete (user + system)"
    ;;
  *)
    ui_error "Invalid CANVA_FLATPAK_SCOPE: ${SCOPE} (expected: user, system, all)"
    exit 1
    ;;
esac
