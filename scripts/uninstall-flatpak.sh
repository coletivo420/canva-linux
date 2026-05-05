#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
ui_init
flatpak kill "$APP_ID" 2>/dev/null || true
flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true
ui_ok "Flatpak uninstall complete"
