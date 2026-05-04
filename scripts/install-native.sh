#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"
source "${SCRIPT_DIR}/runtime-guidance-common.sh"

validate_native_scope
resolve_native_paths
if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  echo "Native Install will use system scope."
  echo "The app will be available to all users on this machine."
  echo "Administrator authorization will be requested to write to /opt, /usr/local/bin and /usr/local/share."
else
  echo "Native Install will use user scope."
  echo "The app will be available only to the current user."
  echo "Administrator authorization should not be required."
fi
bash "${SCRIPT_DIR}/build-electron-dir.sh"
install_native_from_dist "${REPO_ROOT}/dist/linux-unpacked"
tmp="$(mktemp)"
write_desktop_file "${tmp}" "${INSTALL_PREFIX}/${APP_EXECUTABLE}" "${APP_ID}"
if [[ "${NATIVE_SCOPE}" == "system" ]]; then sudo install -Dm644 "${tmp}" "${INSTALL_DESKTOP}"; else install -Dm644 "${tmp}" "${INSTALL_DESKTOP}"; fi
rm -f "${tmp}"
if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  install_icons "${REPO_ROOT}/build-resources/icons/hicolor" "/usr/local/share/icons/hicolor"
else
  install_icons "${REPO_ROOT}/build-resources/icons/hicolor" "${HOME}/.local/share/icons/hicolor"
fi
update_desktop_caches "${NATIVE_SCOPE}"
print_native_post_install_guidance
