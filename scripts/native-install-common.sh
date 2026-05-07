#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-identity-common.sh"
source "${SCRIPT_DIR}/install-layout-common.sh"
source "${SCRIPT_DIR}/desktop-integration-common.sh"
source "${SCRIPT_DIR}/user-data-common.sh"
source "${SCRIPT_DIR}/ui-common.sh"
source "${SCRIPT_DIR}/sudo-common.sh"

NATIVE_SCOPE="${CANVA_NATIVE_SCOPE:-system}"
validate_native_scope(){ case "${NATIVE_SCOPE}" in system|user) ;; *) ui_error "CANVA_NATIVE_SCOPE must be system or user"; exit 1;; esac; }
resolve_native_paths(){ [[ "${NATIVE_SCOPE}" == system ]] && resolve_native_system_layout || resolve_native_user_layout; }
install_native_from_dist(){ local dist_dir="$1"; if [[ "${NATIVE_SCOPE}" == system ]]; then canva_sudo_rm -rf "${INSTALL_PREFIX}"; canva_sudo_mkdir -p "${INSTALL_PREFIX}" "$(dirname "${INSTALL_BIN}")" "$(dirname "${INSTALL_DESKTOP}")"; canva_sudo_cp -a "${dist_dir}/." "${INSTALL_PREFIX}/"; canva_sudo_chmod -R a+rX "${INSTALL_PREFIX}"; canva_sudo_ln -sfn "${INSTALL_PREFIX}/${APP_EXECUTABLE}" "${INSTALL_BIN}"; else rm -rf "${INSTALL_PREFIX}"; mkdir -p "${INSTALL_PREFIX}" "$(dirname "${INSTALL_BIN}")" "$(dirname "${INSTALL_DESKTOP}")"; cp -a "${dist_dir}/." "${INSTALL_PREFIX}/"; ln -sfn "${INSTALL_PREFIX}/${APP_EXECUTABLE}" "${INSTALL_BIN}"; fi }
uninstall_native_scope(){ [[ "${NATIVE_SCOPE}" == system ]] && uninstall_native_system || uninstall_native_user; }
uninstall_native_system(){ if [[ -d /opt/canva-linux || -L /usr/local/bin/${APP_EXECUTABLE} || -f /usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME} ]]; then canva_sudo_rm -rf /opt/canva-linux /usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME} /usr/local/bin/${APP_EXECUTABLE}; ui_ok "Native system install removed"; else ui_info "No Native system install detected"; fi }
uninstall_native_user(){ if [[ -d "${HOME}/.local/opt/canva-linux" || -L "${HOME}/.local/bin/${APP_EXECUTABLE}" || -f "${HOME}/.local/share/applications/${APP_NATIVE_DESKTOP_NAME}" ]]; then rm -rf "${HOME}/.local/opt/canva-linux" "${HOME}/.local/share/applications/${APP_NATIVE_DESKTOP_NAME}" "${HOME}/.local/bin/${APP_EXECUTABLE}"; ui_ok "Native user install removed"; else ui_info "No Native user install detected"; fi }
