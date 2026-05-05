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
read_package_json_version(){
  local package_file="$1"
  [[ -f "$package_file" ]] || return 0
  command -v node >/dev/null 2>&1 || return 0
  node -e 'try { const pkg = require(process.argv[1]); if (pkg.version) console.log(pkg.version); } catch {}' "$package_file" 2>/dev/null || true
}
read_flatpak_version_marker(){
  local marker_file="$1"
  [[ -f "$marker_file" ]] || return 0
  local raw version
  raw="$(tr -d '\r' < "$marker_file" || true)"
  [[ -n "$raw" ]] || return 0
  if [[ "$raw" == *\"version\"* ]]; then
    version="$(printf '%s\n' "$raw" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    [[ -n "$version" ]] && printf '%s\n' "$version"
    return 0
  fi
  printf '%s\n' "$raw" | head -n1
}
detect_native_system_version(){
  local version
  version="$(read_version_file "/opt/canva-linux/CANVA_LINUX_VERSION")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  read_package_json_version "/opt/canva-linux/package.json"
}
detect_native_user_version(){
  local version
  version="$(read_version_file "${HOME}/.local/opt/canva-linux/CANVA_LINUX_VERSION")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  read_package_json_version "${HOME}/.local/opt/canva-linux/package.json"
}
detect_flatpak_system_version(){
  local marker version
  marker="/var/lib/flatpak/app/${APP_ID}/current/active/files/share/canva-linux/version"
  version="$(read_flatpak_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  command -v flatpak >/dev/null 2>&1 || return 0
  flatpak --system info "${APP_ID}" --show-version 2>/dev/null || true
}
detect_flatpak_user_version(){
  local marker version
  marker="${HOME}/.local/share/flatpak/app/${APP_ID}/current/active/files/share/canva-linux/version"
  version="$(read_flatpak_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  command -v flatpak >/dev/null 2>&1 || return 0
  flatpak --user info "${APP_ID}" --show-version 2>/dev/null || true
}
detect_appimage_version(){
  local file name
  file="$(find dist -maxdepth 1 -type f -name '*.AppImage' 2>/dev/null | sort | tail -n1 || true)"
  [[ -n "$file" ]] || return 0
  name="$(basename "$file")"
  [[ "$name" =~ ^canva-linux-([0-9]+\.[0-9]+\.[0-9]+[-.a-zA-Z0-9]*)-[^-]+\.AppImage$ ]] || return 0
  printf '%s\n' "${BASH_REMATCH[1]}"
}

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
    if [[ "$DETECTED_NATIVE_SYSTEM" == true ]]; then
      echo "[1] Native Install — system"
      echo "    /opt/canva-linux"
      echo "    $(format_detected_status true "$DETECTED_NATIVE_SYSTEM_VERSION")"
      echo
    fi
    if [[ "$DETECTED_NATIVE_USER" == true ]]; then
      echo "[2] Native Install — user"
      echo "    ~/.local/opt/canva-linux"
      echo "    $(format_detected_status true "$DETECTED_NATIVE_USER_VERSION")"
      echo
    fi
    if [[ "$DETECTED_FLATPAK_SYSTEM" == true ]]; then
      echo "[3] Flatpak Install — system"
      echo "    ${APP_ID}"
      echo "    $(format_detected_status true "$DETECTED_FLATPAK_SYSTEM_VERSION")"
      echo
    fi
    if [[ "$DETECTED_FLATPAK_USER" == true ]]; then
      echo "[4] Flatpak Install — user"
      echo "    ${APP_ID}"
      echo "    $(format_detected_status true "$DETECTED_FLATPAK_USER_VERSION")"
      echo
    fi
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

format_detected_status(){
  local detected="$1" version="${2:-}"
  if [[ "$detected" == true ]]; then
    if [[ -n "$version" ]]; then
      printf 'detected v%s' "${version#v}"
    else
      printf 'detected version unknown'
    fi
  else
    printf 'not detected'
  fi
}

print_detection_status_env(){
  printf 'DETECTED_NATIVE_SYSTEM=%s\n' "$DETECTED_NATIVE_SYSTEM"
  printf 'DETECTED_NATIVE_USER=%s\n' "$DETECTED_NATIVE_USER"
  printf 'DETECTED_FLATPAK_SYSTEM=%s\n' "$DETECTED_FLATPAK_SYSTEM"
  printf 'DETECTED_FLATPAK_USER=%s\n' "$DETECTED_FLATPAK_USER"
  printf 'DETECTED_APPIMAGE_ARTIFACTS=%s\n' "$DETECTED_APPIMAGE_ARTIFACTS"
  printf 'DETECTED_NATIVE_SYSTEM_VERSION=%s\n' "$DETECTED_NATIVE_SYSTEM_VERSION"
  printf 'DETECTED_NATIVE_USER_VERSION=%s\n' "$DETECTED_NATIVE_USER_VERSION"
  printf 'DETECTED_FLATPAK_SYSTEM_VERSION=%s\n' "$DETECTED_FLATPAK_SYSTEM_VERSION"
  printf 'DETECTED_FLATPAK_USER_VERSION=%s\n' "$DETECTED_FLATPAK_USER_VERSION"
  printf 'DETECTED_APPIMAGE_VERSION=%s\n' "$DETECTED_APPIMAGE_VERSION"
}

print_detected_installations_compact(){
  detect_installations
  local color_reset="${RESET:-}" color_green="${GREEN:-}" color_purple="${MAGENTA:-}"
  local fmt_status
  fmt_status(){
    local detected="$1" version="$2"
    if [[ "$detected" == true ]]; then
      local ver="version unknown"; [[ -n "${version}" ]] && ver="v${version#v}"
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
