#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-identity-common.sh"

DETECTED_NATIVE_SYSTEM=false
DETECTED_NATIVE_USER=false
DETECTED_FLATPAK_SYSTEM=false
DETECTED_FLATPAK_USER=false
DETECTED_APPIMAGE_ARTIFACTS=false

detect_native_system_install(){ [[ -d /opt/canva-linux || -L /usr/local/bin/${APP_EXECUTABLE} || -f /usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME} ]]; }
detect_native_user_install(){ [[ -d "${HOME}/.local/opt/canva-linux" || -L "${HOME}/.local/bin/${APP_EXECUTABLE}" || -f "${HOME}/.local/share/applications/${APP_NATIVE_DESKTOP_NAME}" ]]; }
detect_flatpak_system_install(){ command -v flatpak >/dev/null 2>&1 && flatpak --system info "${APP_ID}" >/dev/null 2>&1; }
detect_flatpak_user_install(){ command -v flatpak >/dev/null 2>&1 && flatpak --user info "${APP_ID}" >/dev/null 2>&1; }
detect_appimage_artifacts(){ compgen -G "dist/*.AppImage" >/dev/null; }

detect_installations(){
  detect_native_system_install && DETECTED_NATIVE_SYSTEM=true || DETECTED_NATIVE_SYSTEM=false
  detect_native_user_install && DETECTED_NATIVE_USER=true || DETECTED_NATIVE_USER=false
  detect_flatpak_system_install && DETECTED_FLATPAK_SYSTEM=true || DETECTED_FLATPAK_SYSTEM=false
  detect_flatpak_user_install && DETECTED_FLATPAK_USER=true || DETECTED_FLATPAK_USER=false
  detect_appimage_artifacts && DETECTED_APPIMAGE_ARTIFACTS=true || DETECTED_APPIMAGE_ARTIFACTS=false
}

has_detected_installed_variants(){ [[ "$DETECTED_NATIVE_SYSTEM" == true || "$DETECTED_NATIVE_USER" == true || "$DETECTED_FLATPAK_SYSTEM" == true || "$DETECTED_FLATPAK_USER" == true ]]; }
has_detected_installations(){ [[ "$DETECTED_NATIVE_SYSTEM" == true || "$DETECTED_NATIVE_USER" == true || "$DETECTED_FLATPAK_SYSTEM" == true || "$DETECTED_FLATPAK_USER" == true || "$DETECTED_APPIMAGE_ARTIFACTS" == true ]]; }

print_detected_installations(){
  if has_detected_installed_variants; then
    echo "Detected installed variants:"
    echo
    [[ "$DETECTED_NATIVE_SYSTEM" == true ]] && echo "[1] Native Install — system" && echo "    /opt/canva-linux" && echo
    [[ "$DETECTED_NATIVE_USER" == true ]] && echo "[2] Native Install — user" && echo "    ~/.local/opt/canva-linux" && echo
    [[ "$DETECTED_FLATPAK_SYSTEM" == true ]] && echo "[3] Flatpak Install — system" && echo "    ${APP_ID}" && echo
    [[ "$DETECTED_FLATPAK_USER" == true ]] && echo "[4] Flatpak Install — user" && echo "    ${APP_ID}" && echo
  else
    echo "No Native or Flatpak installations detected."
    echo
  fi

  if [[ "$DETECTED_APPIMAGE_ARTIFACTS" == true ]]; then
    echo "Detected generated artifacts:"
    echo
    find dist -maxdepth 1 -type f -name '*.AppImage' | sort | sed 's/^/  /'
    echo
    echo "Use --clean to remove generated package artifacts."
  fi
}


print_detected_installations_compact(){
  detect_installations
  local native="none" flatpak="none" appimage="no"
  if [[ "$DETECTED_NATIVE_SYSTEM" == true && "$DETECTED_NATIVE_USER" == true ]]; then native="system+user";
  elif [[ "$DETECTED_NATIVE_SYSTEM" == true ]]; then native="system";
  elif [[ "$DETECTED_NATIVE_USER" == true ]]; then native="user"; fi
  if [[ "$DETECTED_FLATPAK_SYSTEM" == true && "$DETECTED_FLATPAK_USER" == true ]]; then flatpak="system+user";
  elif [[ "$DETECTED_FLATPAK_SYSTEM" == true ]]; then flatpak="system";
  elif [[ "$DETECTED_FLATPAK_USER" == true ]]; then flatpak="user"; fi
  [[ "$DETECTED_APPIMAGE_ARTIFACTS" == true ]] && appimage="yes"
  echo "Detected Installation State:"
  echo "  Native: ${native}"
  echo "  Flatpak: ${flatpak}"
  echo "  AppImage artifacts: ${appimage}"
}
