#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"
source "${SCRIPT_DIR}/runtime-guidance-common.sh"

validate_native_scope
resolve_native_paths
if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  ui_section "Native system install"
  ui_info "The app will be available to all users on this machine."
  ui_warn "Administrator authorization will be requested to write to /opt, /usr/local/bin and /usr/local/share."
  canva_sudo_validate
else
  ui_section "Native user install"
  ui_info "The app will be available only to the current user."
  ui_info "Administrator authorization should not be required."
fi
bash "${SCRIPT_DIR}/build-electron-dir.sh"
install_native_from_dist "${REPO_ROOT}/dist/linux-unpacked"
VERSION_MARKER="${PROJECT_PHASE:-${PROJECT_DISPLAY_VERSION:-unknown}}"
if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  printf "%s\n" "${VERSION_MARKER}" | canva_sudo tee "${INSTALL_PREFIX}/CANVA_LINUX_VERSION" >/dev/null
else
  printf "%s\n" "${VERSION_MARKER}" > "${INSTALL_PREFIX}/CANVA_LINUX_VERSION"
fi
tmp="$(mktemp)"
write_desktop_file "${tmp}" "${INSTALL_PREFIX}/${APP_EXECUTABLE}" "${APP_ID}"
if [[ "${NATIVE_SCOPE}" == "system" ]]; then canva_sudo_install -Dm644 "${tmp}" "${INSTALL_DESKTOP}"; else install -Dm644 "${tmp}" "${INSTALL_DESKTOP}"; fi
rm -f "${tmp}"
if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  install_icons "${NATIVE_SCOPE}" "${REPO_ROOT}/data/icons/hicolor" "/usr/local/share/icons/hicolor"
else
  install_icons "${NATIVE_SCOPE}" "${REPO_ROOT}/data/icons/hicolor" "${HOME}/.local/share/icons/hicolor"
fi
update_desktop_caches "${NATIVE_SCOPE}" || true
print_native_post_install_guidance || true
ui_ok "Native ${NATIVE_SCOPE} install completed"
