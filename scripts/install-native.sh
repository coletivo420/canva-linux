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
write_desktop_file "${NATIVE_PREFIX}/canva-linux"
install_native_icons "${REPO_ROOT}/build-resources/icons/hicolor"
update_native_desktop_caches
print_native_post_install_guidance
