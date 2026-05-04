#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ID="io.github.coletivo420.canva-linux"
FORCE=false

show_help(){ cat <<'H'
Canva Linux — Install, Package and Build Workflow
Usage:
  ./canva-linux.sh [actions] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
H
}

run_interactive_mode(){ show_help; exit 0; }
confirm_or_exit() {
  local prompt="$1"
  if [[ "${FORCE}" == "true" ]]; then
    return 0
  fi
  local answer
  read -r -p "${prompt} [y/N] " answer
  [[ "${answer}" =~ ^[Yy]$ ]] || { echo "[info] Canceled."; exit 0; }
}

action_uninstall_flatpak(){ flatpak kill "$APP_ID" 2>/dev/null || true; flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true; sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true; }

action_reset_user_data(){
  rm -rf "$HOME/.var/app/$APP_ID" "$HOME/.config/Canva Linux" "$HOME/.cache/Canva Linux" "$HOME/.local/share/Canva Linux"
  echo "[ok] User data removed for Flatpak and Native paths"
}

action_uninstall(){
  if [[ "${FORCE}" == "true" ]]; then
    "${SCRIPT_DIR}/scripts/uninstall-native.sh" all
    action_uninstall_flatpak
    return
  fi

  cat <<'MENU'
Detected installations:
  1) Remove Native installations only
  2) Remove Flatpak installations only
  3) Remove all detected installations
  0) Cancel
MENU
  local c
  read -r -p "Choose an option: " c
  case "$c" in
    1) "${SCRIPT_DIR}/scripts/uninstall-native.sh" all ;;
    2) action_uninstall_flatpak ;;
    3) "${SCRIPT_DIR}/scripts/uninstall-native.sh" all; action_uninstall_flatpak ;;
    *) echo "[info] Canceled." ;;
  esac
}

action_purge(){
  confirm_or_exit "This will erase login, session, cookies, cache and local Canva Linux data. Continue?"
  "${SCRIPT_DIR}/scripts/uninstall-native.sh" all --purge-data || true
  action_uninstall_flatpak || true
  action_reset_user_data
}

if [[ $# -eq 0 ]]; then run_interactive_mode; fi
for a in "$@"; do
  case "$a" in
    -y|--yes|--force) FORCE=true ;;
  esac
done

for a in "$@"; do
case "$a" in
 --help|-h) show_help; exit 0;;
 -y|--yes|--force) ;;
 --install-native) "${SCRIPT_DIR}/scripts/install-native.sh";;
 --install-flatpak|--install) "${SCRIPT_DIR}/scripts/install-flatpak-local.sh";;
 --bundle-flatpak|--bundle) "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh";;
 --run-flatpak-dev|--run-dev) "${SCRIPT_DIR}/scripts/run-flatpak-dev.sh";;
 --build-runtime) npm run build:runtime;;
 --build-dir) "${SCRIPT_DIR}/scripts/build-electron-dir.sh";;
 --validate) "${SCRIPT_DIR}/scripts/validate-project.sh";;
 --doctor) "${SCRIPT_DIR}/scripts/doctor.sh";;
 --clean) "${SCRIPT_DIR}/scripts/clean-artifacts.sh";;
 --uninstall-native) "${SCRIPT_DIR}/scripts/uninstall-native.sh";;
 --uninstall-flatpak) action_uninstall_flatpak;;
 --uninstall) action_uninstall;;
 --reset-user-data) action_reset_user_data;;
 --purge) action_purge;;
 --bundle-appimage|--bundle-deb|--bundle-rpm|--prepare-aur) echo "[planned] $a";;
 *) echo "Unknown option: $a"; exit 1;;
esac
done
