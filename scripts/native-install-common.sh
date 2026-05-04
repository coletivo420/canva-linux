#!/usr/bin/env bash
set -euo pipefail

APP_ID="io.github.coletivo420.canva-linux"
APP_NAME="Canva Linux"
NATIVE_SCOPE="${CANVA_NATIVE_SCOPE:-system}"

NATIVE_SYSTEM_PREFIX="/opt/canva-linux"
NATIVE_SYSTEM_BIN="/usr/local/bin/canva-linux"
NATIVE_SYSTEM_DESKTOP="/usr/local/share/applications/${APP_ID}.native.desktop"
NATIVE_SYSTEM_ICON_ROOT="/usr/local/share/icons/hicolor"

NATIVE_USER_PREFIX="${HOME}/.local/opt/canva-linux"
NATIVE_USER_BIN="${HOME}/.local/bin/canva-linux"
NATIVE_USER_DESKTOP="${HOME}/.local/share/applications/${APP_ID}.native.desktop"
NATIVE_USER_ICON_ROOT="${HOME}/.local/share/icons/hicolor"

validate_native_scope() {
  case "${NATIVE_SCOPE}" in
    system|user) ;;
    *) echo "[error] CANVA_NATIVE_SCOPE must be system or user" >&2; exit 1 ;;
  esac
}

resolve_native_paths() {
  if [[ "${NATIVE_SCOPE}" == "system" ]]; then
    NATIVE_PREFIX="${NATIVE_SYSTEM_PREFIX}"
    NATIVE_BIN="${NATIVE_SYSTEM_BIN}"
    NATIVE_DESKTOP="${NATIVE_SYSTEM_DESKTOP}"
    NATIVE_ICON_ROOT="${NATIVE_SYSTEM_ICON_ROOT}"
  else
    NATIVE_PREFIX="${NATIVE_USER_PREFIX}"
    NATIVE_BIN="${NATIVE_USER_BIN}"
    NATIVE_DESKTOP="${NATIVE_USER_DESKTOP}"
    NATIVE_ICON_ROOT="${NATIVE_USER_ICON_ROOT}"
  fi
}

install_native_from_dist() {
  local dist_dir="$1"
  if [[ "${NATIVE_SCOPE}" == "system" ]]; then
    sudo rm -rf "${NATIVE_PREFIX}"
    sudo mkdir -p "${NATIVE_PREFIX}" "$(dirname "${NATIVE_BIN}")" "$(dirname "${NATIVE_DESKTOP}")"
    sudo cp -a "${dist_dir}/." "${NATIVE_PREFIX}/"
    sudo chmod -R a+rX "${NATIVE_PREFIX}"
    sudo ln -sfn "${NATIVE_PREFIX}/canva-linux" "${NATIVE_BIN}"
  else
    rm -rf "${NATIVE_PREFIX}"
    mkdir -p "${NATIVE_PREFIX}" "$(dirname "${NATIVE_BIN}")" "$(dirname "${NATIVE_DESKTOP}")"
    cp -a "${dist_dir}/." "${NATIVE_PREFIX}/"
    ln -sfn "${NATIVE_PREFIX}/canva-linux" "${NATIVE_BIN}"
  fi
}

write_desktop_file() {
  local exec_path="$1"
  local tmp
  tmp="$(mktemp)"
  cat > "${tmp}" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Canva Linux
Comment=A community opensource desktop wrapper for use with Canva
Exec=${exec_path}
Icon=${APP_ID}
Terminal=false
Categories=Graphics;
StartupWMClass=${APP_ID}
DESKTOP

  if [[ "${NATIVE_SCOPE}" == "system" ]]; then
    sudo install -Dm644 "${tmp}" "${NATIVE_DESKTOP}"
  else
    install -Dm644 "${tmp}" "${NATIVE_DESKTOP}"
  fi
  rm -f "${tmp}"
}

install_native_icons() {
  local src_root="$1"
  local size
  for size in 16x16 24x24 32x32 48x48 64x64 128x128 256x256 512x512; do
    local src="${src_root}/${size}.png"
    local dst="${NATIVE_ICON_ROOT}/${size}/apps/${APP_ID}.png"
    [[ -f "${src}" ]] || continue
    if [[ "${NATIVE_SCOPE}" == "system" ]]; then
      sudo install -Dm644 "${src}" "${dst}"
    else
      install -Dm644 "${src}" "${dst}"
    fi
  done
}

uninstall_native_scope() {
  if [[ "${NATIVE_SCOPE}" == "system" ]]; then
    sudo rm -rf "${NATIVE_SYSTEM_PREFIX}" "${NATIVE_SYSTEM_DESKTOP}" "${NATIVE_SYSTEM_BIN}"
  else
    rm -rf "${NATIVE_USER_PREFIX}" "${NATIVE_USER_DESKTOP}" "${NATIVE_USER_BIN}"
  fi
}

cleanup_native_user_data() {
  rm -rf "$HOME/.config/${APP_NAME}" "$HOME/.cache/${APP_NAME}" "$HOME/.local/share/${APP_NAME}"
}
