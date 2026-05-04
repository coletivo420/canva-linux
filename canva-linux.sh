#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FORCE=false
source "${SCRIPT_DIR}/scripts/app-identity-common.sh"
source "${SCRIPT_DIR}/scripts/user-data-common.sh"

run_script(){ local script="$1"; shift; [[ -f "$script" ]] || { echo "[error] Script not found: $script" >&2; exit 1; }; bash "$script" "$@"; }

show_help(){ cat <<'H'
Canva Linux — Install, Package and Build Workflow

Usage:
  ./canva-linux.sh [actions] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help

Installation:
  --install-native       Run Native Install
  --install-flatpak      Build and install Flatpak locally
  --install              Compatibility alias for --install-flatpak

Native install scope:
  CANVA_NATIVE_SCOPE=system   Install system-wide, default
  CANVA_NATIVE_SCOPE=user     Install only for the current user

Flatpak install scope:
  CANVA_FLATPAK_SCOPE=system  Install system-wide, default
  CANVA_FLATPAK_SCOPE=user    Install only for the current user

Packaging:
  --bundle-flatpak       Create distributable .flatpak package
  --bundle               Compatibility alias for --bundle-flatpak
  --bundle-appimage      Create experimental AppImage package
  --bundle-deb           Planned
  --bundle-rpm           Planned
  --prepare-aur          Planned

Build:
  --build-runtime        Build compiled Electron runtime
  --build-dir            Build Electron dist/linux-unpacked output

Validation:
  --validate             Run full project validation
  --validate-appimage    Validate generated AppImage artifacts
  --doctor               Check host tools

Maintenance:
  --clean                Remove generated build/package artifacts

Uninstall:
  --uninstall            Detect and uninstall installed variants
  --uninstall-native     Uninstall Native Install
  --uninstall-flatpak    Uninstall Flatpak Install
  --reset-user-data      Delete login/session/cache data
  --purge                Uninstall detected variants and remove user data
H
}

run_interactive_mode(){
  if [[ ! -t 0 ]]; then
    show_help
    exit 0
  fi
  cat <<'MENU'
Canva Linux — Install, Package and Build

Installation:
  1) Native Install
  2) Flatpak Install

Packaging:
  3) Create .flatpak package
  4) Create AppImage
  5) Create .deb package [planned]
  6) Create .rpm package [planned]
  7) Prepare AUR/PKGBUILD [planned]

Build:
  8) Build runtime
  9) Build Electron linux-unpacked dir

Validation:
  10) Validate project
  11) Validate AppImage artifacts
  12) Doctor / check host tools

Maintenance:
  13) Clean generated artifacts

Uninstall:
  14) Uninstall detected installations
  15) Uninstall detected installations and remove user data

Other:
  16) Help
  0) Exit
MENU
  local c
  if ! read -r -p "Choose an option: " c; then
    echo "[info] No interactive input detected."
    exit 0
  fi
  case "$c" in
    1) run_script "${SCRIPT_DIR}/scripts/install-native.sh" ;;
    2) run_script "${SCRIPT_DIR}/scripts/install-flatpak-local.sh" ;;
    3) run_script "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh" ;;
    4) run_script "${SCRIPT_DIR}/scripts/build-appimage.sh" ;;
    5|6|7) echo "[planned] Not implemented in this phase." ;;
    8) run_script "${SCRIPT_DIR}/scripts/build-runtime.sh" ;;
    9) run_script "${SCRIPT_DIR}/scripts/build-electron-dir.sh" ;;
    10) run_script "${SCRIPT_DIR}/scripts/validate-project.sh" ;;
    11) run_script "${SCRIPT_DIR}/scripts/validate-appimage.sh" ;;
    12) run_script "${SCRIPT_DIR}/scripts/doctor.sh" ;;
    13) run_script "${SCRIPT_DIR}/scripts/clean-artifacts.sh" ;;
    14) action_uninstall ;;
    15) action_purge ;;
    16) show_help ;;
    *) echo "[info] Exit." ;;
  esac
  exit 0
}

confirm_or_exit() { local prompt="$1"; if [[ "${FORCE}" == "true" ]]; then return 0; fi; local answer; read -r -p "${prompt} [y/N] " answer; [[ "${answer}" =~ ^[Yy]$ ]] || { echo "[info] Canceled."; exit 0; }; }

action_uninstall_flatpak(){ flatpak kill "$APP_ID" 2>/dev/null || true; flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true; sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true; }

detect_installations(){
  DETECTED_NATIVE_SYSTEM=false
  DETECTED_NATIVE_USER=false
  DETECTED_FLATPAK_SYSTEM=false
  DETECTED_FLATPAK_USER=false
  [[ -d /opt/canva-linux || -L /usr/local/bin/canva-linux || -f /usr/local/share/applications/${APP_ID}.native.desktop ]] && DETECTED_NATIVE_SYSTEM=true
  [[ -d "$HOME/.local/opt/canva-linux" || -L "$HOME/.local/bin/canva-linux" || -f "$HOME/.local/share/applications/${APP_ID}.native.desktop" ]] && DETECTED_NATIVE_USER=true
  command -v flatpak >/dev/null 2>&1 && flatpak --system info "$APP_ID" >/dev/null 2>&1 && DETECTED_FLATPAK_SYSTEM=true || true
  command -v flatpak >/dev/null 2>&1 && flatpak --user info "$APP_ID" >/dev/null 2>&1 && DETECTED_FLATPAK_USER=true || true
}

action_uninstall(){
  detect_installations
  if [[ "${DETECTED_NATIVE_SYSTEM}" == false && "${DETECTED_NATIVE_USER}" == false && "${DETECTED_FLATPAK_SYSTEM}" == false && "${DETECTED_FLATPAK_USER}" == false ]]; then
    echo "[info] No Canva Linux installation detected."
    return
  fi
  echo "Detected installations:"; echo
  [[ "${DETECTED_NATIVE_SYSTEM}" == true ]] && echo "[1] Native Install — system" && echo "    /opt/canva-linux" && echo
  [[ "${DETECTED_NATIVE_USER}" == true ]] && echo "[2] Native Install — user" && echo "    ~/.local/opt/canva-linux" && echo
  [[ "${DETECTED_FLATPAK_SYSTEM}" == true ]] && echo "[3] Flatpak Install — system" && echo "    ${APP_ID}" && echo
  [[ "${DETECTED_FLATPAK_USER}" == true ]] && echo "[4] Flatpak Install — user" && echo "    ${APP_ID}" && echo

  if [[ "${FORCE}" == "true" ]]; then run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh" all; action_uninstall_flatpak; return; fi
  cat <<'MENU'
Choose:
  1) Remove Native Install only
  2) Remove Flatpak Install only
  3) Remove all detected installations
  0) Cancel
MENU
  local c; read -r -p "Choose an option: " c
  case "$c" in
    1) run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh" all ;;
    2) action_uninstall_flatpak ;;
    3) run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh" all; action_uninstall_flatpak ;;
    *) echo "[info] Canceled." ;;
  esac
}

action_purge(){ confirm_or_exit "This will erase login, session, cookies, cache and local Canva Linux data. Continue?"; run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh" all --purge-data || true; action_uninstall_flatpak || true; cleanup_all_user_data; echo "[ok] User data removed for Flatpak and Native paths"; }

if [[ $# -eq 0 ]]; then run_interactive_mode; fi
for a in "$@"; do case "$a" in -y|--yes|--force) FORCE=true ;; esac; done
for a in "$@"; do case "$a" in
 --help|-h) show_help; exit 0;; -y|--yes|--force) ;;
 --install-native) run_script "${SCRIPT_DIR}/scripts/install-native.sh";;
 --install-flatpak|--install) run_script "${SCRIPT_DIR}/scripts/install-flatpak-local.sh";;
 --bundle-flatpak|--bundle) run_script "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh";;
 --bundle-appimage) run_script "${SCRIPT_DIR}/scripts/build-appimage.sh";;
 --build-runtime) run_script "${SCRIPT_DIR}/scripts/build-runtime.sh";;
 --build-dir) run_script "${SCRIPT_DIR}/scripts/build-electron-dir.sh";;
 --validate) run_script "${SCRIPT_DIR}/scripts/validate-project.sh";;
 --validate-appimage) run_script "${SCRIPT_DIR}/scripts/validate-appimage.sh";;
 --doctor) run_script "${SCRIPT_DIR}/scripts/doctor.sh";;
 --clean) run_script "${SCRIPT_DIR}/scripts/clean-artifacts.sh";;
 --uninstall-native) run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh";;
 --uninstall-flatpak) action_uninstall_flatpak;;
 --uninstall) action_uninstall;; --reset-user-data) cleanup_all_user_data; echo "[ok] User data removed for Flatpak and Native paths";; --purge) action_purge;;
 --bundle-deb|--bundle-rpm|--prepare-aur) echo "[planned] $a";;
 *) echo "Unknown option: $a"; exit 1;; esac; done
