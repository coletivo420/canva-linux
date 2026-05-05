#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-identity-common.sh"

DETECTED_NATIVE_SYSTEM=false
DETECTED_NATIVE_USER=false
DETECTED_FLATPAK_SYSTEM=false
DETECTED_FLATPAK_USER=false
DETECTED_APPIMAGE_ARTIFACTS=false

DETECTED_NATIVE_SYSTEM_VERSION=""
DETECTED_NATIVE_USER_VERSION=""
DETECTED_FLATPAK_SYSTEM_VERSION=""
DETECTED_FLATPAK_USER_VERSION=""
DETECTED_APPIMAGE_VERSION=""

detect_native_system_install(){ [[ -d /opt/canva-linux || -L /usr/local/bin/${APP_EXECUTABLE} || -f /usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME} ]]; }
detect_native_user_install(){ [[ -d "${HOME}/.local/opt/canva-linux" || -L "${HOME}/.local/bin/${APP_EXECUTABLE}" || -f "${HOME}/.local/share/applications/${APP_NATIVE_DESKTOP_NAME}" ]]; }
detect_flatpak_system_install(){ command -v flatpak >/dev/null 2>&1 && flatpak --system info "${APP_ID}" >/dev/null 2>&1; }
detect_flatpak_user_install(){ command -v flatpak >/dev/null 2>&1 && flatpak --user info "${APP_ID}" >/dev/null 2>&1; }
detect_appimage_artifacts(){ compgen -G "dist/*.AppImage" >/dev/null; }

read_version_file(){ local version_file="$1"; [[ -f "$version_file" ]] && tr -d '[:space:]' < "$version_file" || true; }
detect_native_system_version(){ read_version_file "/opt/canva-linux/CANVA_LINUX_VERSION"; }
detect_native_user_version(){ read_version_file "${HOME}/.local/opt/canva-linux/CANVA_LINUX_VERSION"; }
detect_flatpak_system_version(){ command -v flatpak >/dev/null 2>&1 || return 0; local v; v=$(flatpak --system info "${APP_ID}" --show-version 2>/dev/null || true); [[ -n "${v}" ]] && { echo "${v}"; return 0; }; local d="/var/lib/flatpak/app/${APP_ID}/current/active/files/share/canva-linux/version"; [[ -f "$d" ]] && sed -n 's/.*"version": "\([^\"]*\)".*/\1/p' "$d" | head -n1 || true; }
detect_flatpak_user_version(){ command -v flatpak >/dev/null 2>&1 || return 0; local v; v=$(flatpak --user info "${APP_ID}" --show-version 2>/dev/null || true); [[ -n "${v}" ]] && { echo "${v}"; return 0; }; local d="${HOME}/.local/share/flatpak/app/${APP_ID}/current/active/files/share/canva-linux/version"; [[ -f "$d" ]] && sed -n 's/.*"version": "\([^\"]*\)".*/\1/p' "$d" | head -n1 || true; }
detect_appimage_version(){ local file; file=$(find dist -maxdepth 1 -type f -name '*.AppImage' | sort | tail -n1 || true); [[ -n "$file" ]] || return 0; basename "$file" | sed -E 's/.*(v?[0-9]+\.[0-9]+\.[0-9]+([-a-zA-Z0-9\.]*)?).*/\1/'; }

detect_installations(){
  detect_native_system_install && DETECTED_NATIVE_SYSTEM=true || DETECTED_NATIVE_SYSTEM=false
  detect_native_user_install && DETECTED_NATIVE_USER=true || DETECTED_NATIVE_USER=false
  detect_flatpak_system_install && DETECTED_FLATPAK_SYSTEM=true || DETECTED_FLATPAK_SYSTEM=false
  detect_flatpak_user_install && DETECTED_FLATPAK_USER=true || DETECTED_FLATPAK_USER=false
  detect_appimage_artifacts && DETECTED_APPIMAGE_ARTIFACTS=true || DETECTED_APPIMAGE_ARTIFACTS=false
  DETECTED_NATIVE_SYSTEM_VERSION="$(detect_native_system_version)"
  DETECTED_NATIVE_USER_VERSION="$(detect_native_user_version)"
  DETECTED_FLATPAK_SYSTEM_VERSION="$(detect_flatpak_system_version)"
  DETECTED_FLATPAK_USER_VERSION="$(detect_flatpak_user_version)"
  DETECTED_APPIMAGE_VERSION="$(detect_appimage_version)"

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
  local color_reset="${RESET:-}" color_green="${GREEN:-}" color_purple="${MAGENTA:-}"
  local fmt_status
  fmt_status(){
    local detected="$1" version="$2"
    if [[ "$detected" == true ]]; then
      local ver="version unknown"; [[ -n "${version}" ]] && ver="v${version}"
      printf '%sdetected%s      %s' "${color_green}" "${color_reset}" "${ver}"
    else
      printf '%snot detected%s' "${color_purple}" "${color_reset}"
    fi
  }
  echo "Detected Installations"
  echo "  Native System:   $(fmt_status "$DETECTED_NATIVE_SYSTEM" "$DETECTED_NATIVE_SYSTEM_VERSION")"
  echo "  Native User:     $(fmt_status "$DETECTED_NATIVE_USER" "$DETECTED_NATIVE_USER_VERSION")"
  echo "  Flatpak System:  $(fmt_status "$DETECTED_FLATPAK_SYSTEM" "$DETECTED_FLATPAK_SYSTEM_VERSION")"
  echo "  Flatpak User:    $(fmt_status "$DETECTED_FLATPAK_USER" "$DETECTED_FLATPAK_USER_VERSION")"
  echo "  AppImage:        $(fmt_status "$DETECTED_APPIMAGE_ARTIFACTS" "$DETECTED_APPIMAGE_VERSION")"
}

