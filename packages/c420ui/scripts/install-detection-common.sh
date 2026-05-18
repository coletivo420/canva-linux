#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
source "${REPO_ROOT}/scripts/app-identity-common.sh"

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
DETECTED_NATIVE_SYSTEM_FULL_VERSION=""
DETECTED_NATIVE_USER_FULL_VERSION=""
DETECTED_FLATPAK_SYSTEM_FULL_VERSION=""
DETECTED_FLATPAK_USER_FULL_VERSION=""
DETECTED_APPIMAGE_FULL_VERSION=""

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
  node -e 'try { const pkg = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (pkg.version) console.log(pkg.version); } catch {}' "$package_file" 2>/dev/null || true
}
read_build_metadata_full_version(){
  local metadata_file="$1"
  [[ -f "$metadata_file" ]] || return 0
  command -v node >/dev/null 2>&1 || return 0
  node -e 'try { const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (m.fullVersion || m.version) console.log(m.fullVersion || m.version); } catch {}' "$metadata_file" 2>/dev/null || true
}
read_build_metadata_base_version(){
  local metadata_file="$1"
  [[ -f "$metadata_file" ]] || return 0
  command -v node >/dev/null 2>&1 || return 0
  node -e 'try { const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (m.baseVersion || m.basePhase || m.version) console.log(m.baseVersion || m.basePhase || m.version); } catch {}' "$metadata_file" 2>/dev/null || true
}

find_flatpak_version_marker(){
  local scope_root="$1" marker
  marker="${scope_root}/app/${APP_ID}/current/active/files/share/canva-linux/version"
  if [[ -f "$marker" ]]; then printf '%s\n' "$marker"; return 0; fi
  marker="$( [[ -d "${scope_root}/app/${APP_ID}" ]] && find "${scope_root}/app/${APP_ID}" -maxdepth 8 -path '*/active/files/share/canva-linux/version' -type f 2>/dev/null | sort | tail -n1 || true)"
  [[ -n "$marker" ]] && printf '%s\n' "$marker"
}
find_latest_appimage_artifact() {
  find dist -maxdepth 1 -type f -name '*.AppImage' 2>/dev/null | sort | tail -n1 || true
}

find_artifact_build_metadata_marker() {
  local artifact_path="$1"
  [[ -n "$artifact_path" ]] || return 0

  local marker
  for marker in \
    "${artifact_path}.build-metadata.json" \
    "${artifact_path}.version.json" \
    "${artifact_path}.version"; do
    [[ -f "$marker" ]] && {
      printf '%s\n' "$marker"
      return 0
    }
  done
  return 0
}
read_flatpak_version_marker_key(){
  local marker_file="$1" key="$2"
  [[ -f "$marker_file" ]] || return 0
  local raw version
  raw="$(tr -d '\r' < "$marker_file" || true)"
  [[ -n "$raw" ]] || return 0
  if [[ "$raw" == *\"${key}\"* ]]; then
    version="$(printf '%s\n' "$raw" | sed -n 's/.*"'"$key"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    [[ -n "$version" ]] && printf '%s\n' "$version"
    return 0
  fi
}
read_flatpak_version_marker(){
  local marker_file="$1" version
  [[ -f "$marker_file" ]] || return 0
  version="$(read_flatpak_version_marker_key "$marker_file" "version")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  tr -d '\r' < "$marker_file" | head -n1 || true
}
read_flatpak_full_version_marker(){
  local marker_file="$1" version
  [[ -f "$marker_file" ]] || return 0
  version="$(read_flatpak_version_marker_key "$marker_file" "fullVersion")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  read_flatpak_version_marker "$marker_file"
}
detect_native_system_version(){
  local version
  version="$(read_build_metadata_base_version "/opt/canva-linux/config/canva-linux/build-metadata.json")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  version="$(read_version_file "/opt/canva-linux/CANVA_LINUX_VERSION")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  read_package_json_version "/opt/canva-linux/package.json"
}
detect_native_user_version(){
  local version
  version="$(read_build_metadata_base_version "${HOME}/.local/opt/canva-linux/config/canva-linux/build-metadata.json")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  version="$(read_version_file "${HOME}/.local/opt/canva-linux/CANVA_LINUX_VERSION")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  read_package_json_version "${HOME}/.local/opt/canva-linux/package.json"
}
detect_native_system_full_version(){
  local version
  version="$(read_build_metadata_full_version "/opt/canva-linux/config/canva-linux/build-metadata.json")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  detect_native_system_version
}
detect_native_user_full_version(){
  local version
  version="$(read_build_metadata_full_version "${HOME}/.local/opt/canva-linux/config/canva-linux/build-metadata.json")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  detect_native_user_version
}
detect_flatpak_system_version(){
  local marker version
  marker="$(find_flatpak_version_marker "/var/lib/flatpak" || true)"
  version="$(read_flatpak_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  command -v flatpak >/dev/null 2>&1 || return 0
  flatpak --system info "${APP_ID}" --show-version 2>/dev/null || true
}
detect_flatpak_user_version(){
  local marker version
  marker="$(find_flatpak_version_marker "${HOME}/.local/share/flatpak" || true)"
  version="$(read_flatpak_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  command -v flatpak >/dev/null 2>&1 || return 0
  flatpak --user info "${APP_ID}" --show-version 2>/dev/null || true
}
detect_flatpak_system_full_version(){
  local marker version
  marker="$(find_flatpak_version_marker "/var/lib/flatpak" || true)"
  version="$(read_flatpak_full_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  detect_flatpak_system_version
}
detect_flatpak_user_full_version(){
  local marker version
  marker="$(find_flatpak_version_marker "${HOME}/.local/share/flatpak" || true)"
  version="$(read_flatpak_full_version_marker "$marker")"
  [[ -n "$version" ]] && { printf '%s\n' "$version"; return 0; }
  detect_flatpak_user_version
}
detect_appimage_version(){
  local file metadata version name

  file="$(find_latest_appimage_artifact)"
  metadata="$(find_artifact_build_metadata_marker "$file")"

  version="$(read_build_metadata_base_version "$metadata")"
  [[ -n "$version" ]] && {
    printf '%s\n' "$version"
    return 0
  }

  metadata="$(find dist -maxdepth 8 -path '*/resources/config/canva-linux/build-metadata.json' -type f 2>/dev/null | sort | tail -n1 || true)"
  version="$(read_build_metadata_base_version "$metadata")"
  [[ -n "$version" ]] && {
    printf '%s\n' "$version"
    return 0
  }

  [[ -n "$file" ]] || return 0
  name="$(basename "$file")"
  [[ "$name" =~ ^canva-linux-([0-9]+\.[0-9]+\.[0-9]+[-+.a-zA-Z0-9]*)-[^-]+\.AppImage$ ]] || return 0
  printf '%s\n' "${BASH_REMATCH[1]}"
}
detect_appimage_full_version(){
  local file metadata version

  file="$(find_latest_appimage_artifact)"
  metadata="$(find_artifact_build_metadata_marker "$file")"

  version="$(read_build_metadata_full_version "$metadata")"
  [[ -n "$version" ]] && {
    printf '%s\n' "$version"
    return 0
  }

  metadata="$(find dist -maxdepth 8 -path '*/resources/config/canva-linux/build-metadata.json' -type f 2>/dev/null | sort | tail -n1 || true)"
  version="$(read_build_metadata_full_version "$metadata")"
  [[ -n "$version" ]] && {
    printf '%s\n' "$version"
    return 0
  }

  detect_appimage_version
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
  DETECTED_NATIVE_SYSTEM_FULL_VERSION="$(detect_native_system_full_version)"
  DETECTED_NATIVE_USER_FULL_VERSION="$(detect_native_user_full_version)"
  DETECTED_FLATPAK_SYSTEM_FULL_VERSION="$(detect_flatpak_system_full_version)"
  DETECTED_FLATPAK_USER_FULL_VERSION="$(detect_flatpak_user_full_version)"
  DETECTED_APPIMAGE_FULL_VERSION="$(detect_appimage_full_version)"

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
      echo "    $(format_detected_status true "${DETECTED_NATIVE_SYSTEM_FULL_VERSION:-$DETECTED_NATIVE_SYSTEM_VERSION}")"
      echo
    fi
    if [[ "$DETECTED_NATIVE_USER" == true ]]; then
      echo "[2] Native Install — user"
      echo "    ~/.local/opt/canva-linux"
      echo "    $(format_detected_status true "${DETECTED_NATIVE_USER_FULL_VERSION:-$DETECTED_NATIVE_USER_VERSION}")"
      echo
    fi
    if [[ "$DETECTED_FLATPAK_SYSTEM" == true ]]; then
      echo "[3] Flatpak Install — system"
      echo "    ${APP_ID}"
      echo "    $(format_detected_status true "${DETECTED_FLATPAK_SYSTEM_FULL_VERSION:-$DETECTED_FLATPAK_SYSTEM_VERSION}")"
      echo
    fi
    if [[ "$DETECTED_FLATPAK_USER" == true ]]; then
      echo "[4] Flatpak Install — user"
      echo "    ${APP_ID}"
      echo "    $(format_detected_status true "${DETECTED_FLATPAK_USER_FULL_VERSION:-$DETECTED_FLATPAK_USER_VERSION}")"
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
  printf 'DETECTED_NATIVE_SYSTEM_FULL_VERSION=%s\n' "$DETECTED_NATIVE_SYSTEM_FULL_VERSION"
  printf 'DETECTED_NATIVE_USER_FULL_VERSION=%s\n' "$DETECTED_NATIVE_USER_FULL_VERSION"
  printf 'DETECTED_FLATPAK_SYSTEM_FULL_VERSION=%s\n' "$DETECTED_FLATPAK_SYSTEM_FULL_VERSION"
  printf 'DETECTED_FLATPAK_USER_FULL_VERSION=%s\n' "$DETECTED_FLATPAK_USER_FULL_VERSION"
  printf 'DETECTED_APPIMAGE_FULL_VERSION=%s\n' "$DETECTED_APPIMAGE_FULL_VERSION"
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
  echo "  Native System:   $(fmt_status "$DETECTED_NATIVE_SYSTEM" "${DETECTED_NATIVE_SYSTEM_FULL_VERSION:-$DETECTED_NATIVE_SYSTEM_VERSION}")"
  echo "  Native User:     $(fmt_status "$DETECTED_NATIVE_USER" "${DETECTED_NATIVE_USER_FULL_VERSION:-$DETECTED_NATIVE_USER_VERSION}")"
  echo "  Flatpak System:  $(fmt_status "$DETECTED_FLATPAK_SYSTEM" "${DETECTED_FLATPAK_SYSTEM_FULL_VERSION:-$DETECTED_FLATPAK_SYSTEM_VERSION}")"
  echo "  Flatpak User:    $(fmt_status "$DETECTED_FLATPAK_USER" "${DETECTED_FLATPAK_USER_FULL_VERSION:-$DETECTED_FLATPAK_USER_VERSION}")"
  echo "  AppImage:        $(fmt_status "$DETECTED_APPIMAGE_ARTIFACTS" "${DETECTED_APPIMAGE_FULL_VERSION:-$DETECTED_APPIMAGE_VERSION}")"
}
