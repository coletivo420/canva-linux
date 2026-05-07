#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-identity-common.sh"

resolve_native_system_layout() {
  INSTALL_PREFIX="/opt/canva-linux"
  INSTALL_BIN="/usr/local/bin/${APP_EXECUTABLE}"
  INSTALL_DESKTOP="/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}"
  INSTALL_ICON_ROOT="/usr/local/share/icons/hicolor"
}
resolve_native_user_layout() {
  INSTALL_PREFIX="${HOME}/.local/opt/canva-linux"
  INSTALL_BIN="${HOME}/.local/bin/${APP_EXECUTABLE}"
  INSTALL_DESKTOP="${HOME}/.local/share/applications/${APP_NATIVE_DESKTOP_NAME}"
  INSTALL_ICON_ROOT="${HOME}/.local/share/icons/hicolor"
}
resolve_flatpak_layout() { FLATPAK_DATA_DIR="${APP_FLATPAK_DATA_DIR}"; }
resolve_appimage_layout() { APPIMAGE_DIST_DIR="dist"; }
