#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FORCE=false
source "${SCRIPT_DIR}/scripts/app-identity-common.sh"
source "${SCRIPT_DIR}/scripts/ui-common.sh"
source "${SCRIPT_DIR}/scripts/user-data-common.sh"
source "${SCRIPT_DIR}/scripts/install-detection-common.sh"
ui_init
run_script(){ local script="$1"; shift; [[ -f "$script" ]] || { ui_error "Script not found: $script"; exit 1; }; bash "$script" "$@"; }
show_help(){ cat <<'H'
Canva Linux — Install, Package and Build Workflow
Usage:
  ./canva-linux.sh [actions] [--yes]
Global options:
  -y, --yes
  -h, --help
Installation:
  --install-native
  --install-flatpak
  --install
Development:
  --build-runtime
  --build-dir
  --validate
  --validate-appimage
  --doctor
Package generation:
  --bundle-flatpak
  --bundle
  --bundle-appimage
  --bundle-deb
  --bundle-rpm
  --prepare-aur
Maintenance & Uninstall:
  --clean
  --uninstall
  --uninstall-native
  --uninstall-flatpak
  --reset-user-data
  --purge
H
}
action_uninstall_flatpak(){ flatpak kill "$APP_ID" 2>/dev/null || true; flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true; sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true; }
action_uninstall(){ detect_installations; has_detected_installations || { ui_info "No Canva Linux installation detected."; return; }; print_detected_installations; run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh" all; action_uninstall_flatpak; }
action_purge(){ [[ "$FORCE" == true ]] || { read -r -p "This will erase login, session, cookies, cache and local Canva Linux data. Continue? [y/N] " a; [[ "$a" =~ ^[Yy]$ ]] || exit 0; }; action_uninstall || true; cleanup_all_user_data; ui_ok "User data removed for Flatpak and Native paths"; }
menu_install(){ cat <<'M'
Install
1) Native Install
2) Flatpak Install
0) Back
M
read -r -p "Choose an option: " c; case "$c" in 1) run_script "${SCRIPT_DIR}/scripts/install-native.sh";;2) run_script "${SCRIPT_DIR}/scripts/install-flatpak-local.sh";;*) ;; esac; }
menu_dev(){ cat <<'M'
Development
1) Build runtime
2) Build Electron linux-unpacked dir
3) Validate project
4) Validate AppImage artifacts
5) Doctor / check host tools
6) Create .flatpak package
7) Create AppImage
8) Create .deb package [planned]
9) Create .rpm package [planned]
10) Prepare AUR/PKGBUILD [planned]
0) Back
M
read -r -p "Choose an option: " c; case "$c" in 1) run_script "${SCRIPT_DIR}/scripts/build-runtime.sh";;2) run_script "${SCRIPT_DIR}/scripts/build-electron-dir.sh";;3) run_script "${SCRIPT_DIR}/scripts/validate-project.sh";;4) run_script "${SCRIPT_DIR}/scripts/validate-appimage.sh";;5) run_script "${SCRIPT_DIR}/scripts/doctor.sh";;6) run_script "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh";;7) run_script "${SCRIPT_DIR}/scripts/build-appimage.sh";;8|9|10) ui_planned "Not implemented in this phase.";;*) ;; esac; }
menu_maint(){ cat <<'M'
Maintenance & Uninstall
1) Clean generated artifacts
2) Reset user data
3) Show detected installations
4) Show package/version information
5) Uninstall detected installations
6) Uninstall Native Install
7) Uninstall Flatpak Install
8) Uninstall detected installations and remove user data
0) Back
M
read -r -p "Choose an option: " c; case "$c" in 1) run_script "${SCRIPT_DIR}/scripts/clean-artifacts.sh";;2) action_purge;;3) detect_installations; print_detected_installations;;4) node -p "require('./package.json').version";;5) action_uninstall;;6) run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh";;7) action_uninstall_flatpak;;8) action_purge;;*) ;; esac; }
run_interactive_mode(){ [[ -t 0 ]] || { show_help; exit 0; }; while true; do ui_title "Canva Linux" "Install, Package and Build Workflow"; cat <<'M'
1) Install
2) Development
3) Maintenance & Uninstall
4) Help
0) Exit
M
read -r -p "Choose an option: " c; case "$c" in 1) menu_install;;2) menu_dev;;3) menu_maint;;4) show_help;;0) exit 0;; esac; done; }
[[ $# -eq 0 ]] && run_interactive_mode
for a in "$@"; do [[ "$a" == "-y" || "$a" == "--yes" ]] && FORCE=true; done
for a in "$@"; do case "$a" in --help|-h) show_help;; --install-native) run_script "${SCRIPT_DIR}/scripts/install-native.sh";; --install-flatpak|--install) run_script "${SCRIPT_DIR}/scripts/install-flatpak-local.sh";; --bundle-flatpak|--bundle) run_script "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh";; --bundle-appimage) run_script "${SCRIPT_DIR}/scripts/build-appimage.sh";; --build-runtime) run_script "${SCRIPT_DIR}/scripts/build-runtime.sh";; --build-dir) run_script "${SCRIPT_DIR}/scripts/build-electron-dir.sh";; --validate) run_script "${SCRIPT_DIR}/scripts/validate-project.sh";; --validate-appimage) run_script "${SCRIPT_DIR}/scripts/validate-appimage.sh";; --doctor) run_script "${SCRIPT_DIR}/scripts/doctor.sh";; --clean) run_script "${SCRIPT_DIR}/scripts/clean-artifacts.sh";; --uninstall-native) run_script "${SCRIPT_DIR}/scripts/uninstall-native.sh";; --uninstall-flatpak) action_uninstall_flatpak;; --uninstall) action_uninstall;; --reset-user-data) cleanup_all_user_data;; --purge) action_purge;; --bundle-deb|--bundle-rpm|--prepare-aur) ui_planned "$a";; -y|--yes) ;; *) ui_error "Unknown option: $a"; exit 1;; esac; done
