#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
ui_init
SCOPE="${CANVA_FLATPAK_SCOPE:-user}"
flatpak kill "$APP_ID" 2>/dev/null || true
if [[ "$SCOPE" == "system" ]]; then
  sudo flatpak uninstall --system -y "$APP_ID"
  ui_ok "Flatpak system uninstall complete"
else
  flatpak uninstall --user -y "$APP_ID"
  ui_ok "Flatpak user uninstall complete"
fi
