#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"
FORCE=false
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/user-data-common.sh"
source "${ROOT_DIR}/scripts/install-detection-common.sh"
ui_init
run_script(){ local script="$1"; shift; [[ -f "$script" ]] || { ui_error "Script not found: $script"; exit 1; }; bash "$script" "$@"; }

can_run_tui(){
  [[ -t 0 ]] || return 1
  [[ -t 1 ]] || return 1
  [[ "${TERM:-dumb}" != "dumb" ]] || return 1
  command -v node >/dev/null 2>&1 || return 1
}

run_tui_mode(){
  if ! can_run_tui; then
    ui_error "TUI requires an interactive terminal and Node.js."
    ui_info "Use ./canva-linux.sh --no-tui for the shell menu."
    exit 1
  fi
  CANVA_PROJECT_PHASE="${PROJECT_PHASE}" npm run build:tui
  CANVA_PROJECT_PHASE="${PROJECT_PHASE}" node .build/scripts/tui/index.js
}

show_help(){ cat <<'H'
Canva Linux — Install, Package and Build Workflow

Usage:
  ./canva-linux.sh [actions] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help
  --tui                  Run experimental Blessed TUI
  --no-tui               Force shell interactive menu

Installation:
  --install-native       Run Native Install
  --install-flatpak      Build and install Flatpak locally
  --install              Compatibility alias for --install-flatpak

Development:
  --build-runtime        Build compiled Electron runtime
  --build-dir            Build Electron dist/linux-unpacked output
  --validate             Run full project validation
  --validate-appimage    Validate generated AppImage artifacts
  --validate-appimage-extract Validate AppImage artifacts with optional extraction check
  --doctor               Check host tools

Package generation:
  --bundle-flatpak       Create distributable .flatpak package
  --bundle               Compatibility alias for --bundle-flatpak
  --bundle-appimage      Create experimental AppImage package
  --bundle-deb           Planned
  --bundle-rpm           Planned
  --prepare-aur          Planned

Maintenance & Uninstall:
  --clean                Remove generated build/package artifacts
  --uninstall            Detect and uninstall installed Native/Flatpak variants
  --uninstall-native     Uninstall Native Install
  --uninstall-flatpak    Uninstall Flatpak Install
  --reset-user-data      Delete login/session/cache data
  --purge                Uninstall detected variants and remove user data
H
}
get_package_version(){ node -p "require('./package.json').version" 2>/dev/null || printf 'unknown'; }
print_main_screen(){
  ui_logo
  ui_version_line "$(get_package_version)" "${PROJECT_PHASE}"
  echo
  cat <<'M'
1) Install
2) Development
3) Maintenance & Uninstall
4) Help
0) Exit
M
}
confirm_reset_user_data(){ [[ "$FORCE" == true ]] && return 0; local a; read -r -p "This will erase login, session, cookies, cache and local Canva Linux data. Continue? [y/N] " a; [[ "$a" =~ ^[Yy]$ ]]; }
action_uninstall_flatpak(){ flatpak kill "$APP_ID" 2>/dev/null || true; flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true; sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true; }
action_uninstall(){
  detect_installations
  if ! has_detected_installations; then
    ui_info "No Canva Linux installation or generated package artifact detected."
    return
  fi
  print_detected_installations
  if ! has_detected_installed_variants; then
    ui_info "AppImage artifacts are generated package files and are not removed by uninstall."
    ui_info "Use --clean to remove generated artifacts."
    return
  fi
  if [[ "$FORCE" != true ]]; then
    local a
    read -r -p "Remove detected Native and Flatpak installations? AppImage artifacts are not removed by uninstall. Continue? [y/N] " a
    [[ "$a" =~ ^[Yy]$ ]] || { ui_info "Canceled."; return; }
  fi
  run_script "${ROOT_DIR}/scripts/uninstall-native.sh" all
  action_uninstall_flatpak
}
action_purge(){ confirm_reset_user_data || return; action_uninstall || true; cleanup_all_user_data; ui_ok "User data removed for Flatpak and Native paths"; }
show_version_info(){ local version; version="$(node -p "require('./package.json').version" 2>/dev/null || true)"; [[ -n "$version" ]] || version="unknown"; cat <<V
Project phase:
  ${PROJECT_PHASE}

Package SemVer:
  ${version}

AppID:
  ${APP_ID}

Executable:
  ${APP_EXECUTABLE}

Repository:
  https://github.com/coletivo420/canva-linux
V
}
menu_install(){ cat <<'M'
Install
1) Native Install
2) Flatpak Install
0) Back
M
if ! c="$(ui_read_choice "Choose an option: ")"; then return; fi
case "$c" in
  1) run_script "${ROOT_DIR}/scripts/install-native.sh" ;;
  2) run_script "${ROOT_DIR}/scripts/install-flatpak-local.sh" ;;
  *) ;;
esac
}
menu_dev(){ cat <<'M'
Development
Package generation:
1) Create .flatpak package
2) Create AppImage
3) Prepare AUR/PKGBUILD [planned]
4) Create .deb package [planned]
5) Create .rpm package [planned]

Build:
6) Build runtime
7) Build Electron linux-unpacked dir

Validation:
8) Validate project
9) Validate AppImage artifacts
10) Validate AppImage extraction [optional]
11) Doctor / check host tools
0) Back
M
if ! c="$(ui_read_choice "Choose an option: ")"; then return; fi
case "$c" in
  1) run_script "${ROOT_DIR}/scripts/build-flatpak-bundle.sh" ;;
  2) run_script "${ROOT_DIR}/scripts/build-appimage.sh" ;;
  3|4|5) ui_planned "Not implemented in this phase." ;;
  6) run_script "${ROOT_DIR}/scripts/build-runtime.sh" ;;
  7) run_script "${ROOT_DIR}/scripts/build-electron-dir.sh" ;;
  8) run_script "${ROOT_DIR}/scripts/validate-project.sh" ;;
  9) run_script "${ROOT_DIR}/scripts/validate-appimage.sh" ;;
  10) run_script "${ROOT_DIR}/scripts/validate-appimage.sh" --extract-check ;;
  11) run_script "${ROOT_DIR}/scripts/doctor.sh" ;;
  *) ;;
esac
}
menu_maint(){ cat <<'M'
Maintenance & Uninstall
1) Clean generated artifacts
2) Reset user data
3) Show detected installs/artifacts
4) Show package/version information
5) Uninstall detected installations
6) Uninstall Native Install
7) Uninstall Flatpak Install
8) Uninstall detected installations and remove user data
0) Back
M
if ! c="$(ui_read_choice "Choose an option: ")"; then return; fi
case "$c" in
  1) run_script "${ROOT_DIR}/scripts/clean-artifacts.sh" ;;
  2) if confirm_reset_user_data; then cleanup_all_user_data; ui_ok "User data removed for Flatpak and Native paths"; else ui_info "Canceled."; fi ;;
  3) detect_installations; print_detected_installations ;;
  4) show_version_info ;;
  5) action_uninstall ;;
  6) run_script "${ROOT_DIR}/scripts/uninstall-native.sh" ;;
  7) action_uninstall_flatpak ;;
  8) action_purge ;;
  *) ;;
esac
}
run_interactive_mode(){ [[ -t 0 ]] || { show_help; exit 0; }; while true; do print_main_screen; if ! c="$(ui_read_choice "Choose an option: ")"; then ui_info "No input detected."; exit 0; fi; case "$c" in 1) menu_install;;2) menu_dev;;3) menu_maint;;4) show_help;;0) exit 0;;*) ui_warn "Unknown option: $c";; esac; done; }

if [[ "${CANVA_NO_TUI:-0}" == "1" ]]; then run_interactive_mode; fi
if [[ "${CANVA_TUI:-0}" == "1" ]]; then run_tui_mode; fi
if [[ $# -eq 0 ]]; then run_interactive_mode; fi
for arg in "$@"; do case "$arg" in -y|--yes|--force) FORCE=true;; esac; done
for arg in "$@"; do
  case "$arg" in
    --help|-h) show_help; exit 0 ;;
    --tui) run_tui_mode ;;
    --no-tui) run_interactive_mode ;;
    -y|--yes|--force) ;;
    --install-native) run_script "${ROOT_DIR}/scripts/install-native.sh" ;;
    --install-flatpak|--install) run_script "${ROOT_DIR}/scripts/install-flatpak-local.sh" ;;
    --build-runtime) run_script "${ROOT_DIR}/scripts/build-runtime.sh" ;;
    --build-dir) run_script "${ROOT_DIR}/scripts/build-electron-dir.sh" ;;
    --validate) run_script "${ROOT_DIR}/scripts/validate-project.sh" ;;
    --validate-appimage) run_script "${ROOT_DIR}/scripts/validate-appimage.sh" ;;
    --validate-appimage-extract) run_script "${ROOT_DIR}/scripts/validate-appimage.sh" --extract-check ;;
    --doctor) run_script "${ROOT_DIR}/scripts/doctor.sh" ;;
    --bundle-flatpak|--bundle) run_script "${ROOT_DIR}/scripts/build-flatpak-bundle.sh" ;;
    --bundle-appimage) run_script "${ROOT_DIR}/scripts/build-appimage.sh" ;;
    --bundle-deb|--bundle-rpm|--prepare-aur) ui_planned "$arg is not implemented in this phase." ;;
    --clean) run_script "${ROOT_DIR}/scripts/clean-artifacts.sh" ;;
    --uninstall) action_uninstall ;;
    --uninstall-native) run_script "${ROOT_DIR}/scripts/uninstall-native.sh" ;;
    --uninstall-flatpak) action_uninstall_flatpak ;;
    --reset-user-data) if confirm_reset_user_data; then cleanup_all_user_data; ui_ok "User data removed for Flatpak and Native paths"; else ui_info "Canceled."; fi ;;
    --purge) action_purge ;;
    *) ui_error "Unknown option: $arg"; exit 1 ;;
  esac
done
