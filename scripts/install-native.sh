#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"

print_native_post_install_guidance(){
  echo "Native Install completed."
  echo
  echo "Native Install runs outside the Flatpak sandbox."
  echo "It uses the normal permissions of the user running the application."
  echo
  echo "Run commands:"; echo "  canva-linux"; echo
  echo "Internal Canva Linux logs:"
  echo "  CANVA_DEBUG=1 canva-linux"
  echo "    Shows all internal Canva Linux diagnostics, including startup, session,"
  echo "    tabs, toolbar, permissions, uploads, OAuth, drag-and-drop, eyedropper,"
  echo "    preload and GPU acceleration monitoring."
  echo
  echo "  CANVA_DEBUG=2 canva-linux"
  echo "    Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron"
  echo "    stderr logs."
  echo
  echo "Display backend checks:"; echo "  CANVA_FORCE_WAYLAND=1 canva-linux"; echo "  CANVA_FORCE_X11=1 canva-linux"; echo
  echo "GPU backend checks:"; echo "  CANVA_GPU_BACKEND=auto canva-linux"; echo "  CANVA_GPU_BACKEND=opengl canva-linux"; echo "  CANVA_GPU_BACKEND=vulkan canva-linux"; echo "  CANVA_GPU_BACKEND=software canva-linux"; echo
  echo "Debugging documentation:"; echo "  docs/DEBUGGING.md"; echo
  echo "XDG data cleanup paths:"; echo "  Config: ${XDG_CONFIG_HOME:-${HOME}/.config}"; echo "  Cache:  ${XDG_CACHE_HOME:-${HOME}/.cache}"; echo "  Data:   ${XDG_DATA_HOME:-${HOME}/.local/share}"; echo "  State:  ${XDG_STATE_HOME:-${HOME}/.local/state}"; echo
  echo "Sandbox note:"; echo "  Native Install is not sandboxed by Flatpak."; echo "  For a sandboxed installation, use:"; echo "    ./canva-linux.sh --install-flatpak"; echo
  echo "Native scope:"
  if [[ "${NATIVE_SCOPE}" == "system" ]]; then
    echo "  This installation used system scope."; echo "  Installed path:"; echo "    /opt/canva-linux"; echo "  Command:"; echo "    /usr/local/bin/canva-linux"
  else
    echo "  This installation used user scope."; echo "  Installed path:"; echo "    ~/.local/opt/canva-linux"; echo "  Command:"; echo "    ~/.local/bin/canva-linux"
  fi
}
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
"${SCRIPT_DIR}/build-electron-dir.sh"
install_native_from_dist "${REPO_ROOT}/dist/linux-unpacked"
write_desktop_file "${NATIVE_PREFIX}/canva-linux"
install_native_icons "${REPO_ROOT}/build-resources/icons/hicolor"
update_native_desktop_caches
print_native_post_install_guidance
