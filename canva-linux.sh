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
SESSION_LOG="${CANVA_TOOL_SESSION_LOG:-${XDG_STATE_HOME:-$HOME/.local/state}/canva-linux/tool-session.log}"
mkdir -p "$(dirname "${SESSION_LOG}")"
: > "${SESSION_LOG}"
session_log(){ printf '%s\n' "$1" >> "${SESSION_LOG}"; }
session_log "[session] started"
session_log "[identity] version=${PROJECT_DISPLAY_VERSION:-unknown} phase=${PROJECT_PHASE:-unknown}"
trap 'session_log "[session] ended"' EXIT
ensure_action_runner_available(){
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  ui_error "Node.js is required for shared Action Registry commands and shell menu actions."
  ui_info "Install Node.js, then retry."
  ui_info "Tip: --no-tui shell mode also requires Node.js in dev41+."
  exit 1
}
run_action_by_cli_flag(){ local flag="$1"; ensure_action_runner_available; local yes_args=(); if node scripts/action-runner.js --cli "$flag" --requires-confirmation >/dev/null 2>&1; then [[ "$FORCE" != true ]] && { local a; read -r -p "This action requires confirmation. Continue? [y/N] " a; [[ "$a" =~ ^[Yy]$ ]] || { ui_info "Canceled."; return; }; }; yes_args=(--yes); elif [[ "$FORCE" == true ]]; then yes_args=(--yes); fi; session_log "[action] cli=${flag}"; node scripts/action-runner.js --cli "$flag" "${yes_args[@]}" 2>&1 | tee -a "${SESSION_LOG}"; }
run_action_by_id(){ local id="$1"; ensure_action_runner_available; local yes_args=(); if node scripts/action-runner.js --id "$id" --requires-confirmation >/dev/null 2>&1; then [[ "$FORCE" != true ]] && { local a; read -r -p "This action requires confirmation. Continue? [y/N] " a; [[ "$a" =~ ^[Yy]$ ]] || { ui_info "Canceled."; return; }; }; yes_args=(--yes); elif [[ "$FORCE" == true ]]; then yes_args=(--yes); fi; session_log "[action] id=${id}"; node scripts/action-runner.js --id "$id" "${yes_args[@]}" 2>&1 | tee -a "${SESSION_LOG}"; }

can_run_tui(){
  [[ -t 0 ]] || return 1
  [[ -t 1 ]] || return 1
  [[ "${TERM:-dumb}" != "dumb" ]] || return 1
  [[ "${CANVA_NO_TUI:-0}" != "1" ]] || return 1
  command -v node >/dev/null 2>&1 || return 1
  command -v npm >/dev/null 2>&1 || return 1
  [[ -f "${ROOT_DIR}/scripts/run-tui.js" ]] || return 1
  [[ -f "${ROOT_DIR}/package.json" ]] || return 1
}

TUI_SWITCH_TO_SHELL_EXIT_CODE=42

run_tui_mode(){
  local allow_fallback="${1:-no}"
  if ! can_run_tui; then
    if [[ "$allow_fallback" == "yes" ]]; then
      ui_warn "TUI is unavailable. Falling back to shell menu."
      run_interactive_mode
      return
    fi
    ui_error "TUI requires an interactive terminal, Node.js and npm dependencies."
    ui_info "Use ./canva-linux.sh --no-tui for the shell menu."
    exit 1
  fi
  local status=0
  if [[ -n "${PROJECT_PHASE:-}" ]]; then
    CANVA_PROJECT_PHASE="${PROJECT_PHASE}" node scripts/run-tui.js || status=$?
  else
    node scripts/run-tui.js || status=$?
  fi
  if [[ "$status" -eq "$TUI_SWITCH_TO_SHELL_EXIT_CODE" ]]; then
    run_interactive_mode
    return 0
  fi
  if [[ "$status" -ne 0 ]]; then
    if [[ "$allow_fallback" == "yes" ]]; then
      ui_warn "TUI failed to start. Falling back to shell menu."
      ui_info "You can retry the TUI later with ./canva-linux.sh --tui."
      run_interactive_mode
      return 0
    fi
    return "$status"
  fi
  return 0
}

show_help(){ cat <<'H'
Canva Linux — Install and Development Tool

Usage:
  ./canva-linux.sh [actions] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help
  --tui                  Force Blessed TUI
  --no-tui               Force shell menu fallback

Interactive behavior:
  ./canva-linux.sh opens the Blessed TUI by default when available.
  If TUI dependencies are missing, Canva Linux will try to install them automatically.
  Use --no-tui or CANVA_NO_TUI=1 to use the shell menu.

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
  local display_version="${PROJECT_DISPLAY_VERSION:-$(get_package_version)}"
  local display_status="${PROJECT_STATUS:-}"
  if [[ -n "${display_status}" ]]; then
    ui_version_line "${display_version} (${display_status})" "${PROJECT_PHASE}"
  else
    ui_version_line "${display_version}" "${PROJECT_PHASE}"
  fi
  printf '%s%s%s\n' "${BOLD}${UI_PRIMARY}" "${APP_TOOL_TITLE}" "${RESET}"
  echo
  echo 'Package / Version Information:'
  echo '  App ID: io.github.coletivo420.canva-linux'
  echo '  Executable: canva-linux'
  print_detected_installations_compact
  echo
  cat <<'M'
1) Install
2) Development
3) Maintenance & Uninstall
4) Help
5) Use TUI Tool
0) Exit
M
}

menu_install(){ cat <<'M'
Install
Native Install:
1) System Wide (default)
2) Current User

Flatpak Install:
3) System Wide (default)
4) Current User (warning: may duplicate entries/runtimes/apps)
0) Back
M
if ! c="$(ui_read_choice "Choose an option: ")"; then return; fi
case "$c" in
  1) run_action_by_id "install-native-system" ;;
  2) run_action_by_id "install-native-user" ;;
  3) run_action_by_id "install-flatpak-system" ;;
  4) ui_warn "User-scope Flatpak install may duplicate desktop entries, runtimes or app visibility."; run_action_by_id "install-flatpak-user" ;;
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
  1) run_action_by_id "bundle-flatpak" ;;
  2) run_action_by_id "bundle-appimage" ;;
  3) run_action_by_id "prepare-aur" ;;
  4) run_action_by_id "bundle-deb" ;;
  5) run_action_by_id "bundle-rpm" ;;
  6) run_action_by_id "build-runtime" ;;
  7) run_action_by_id "build-dir" ;;
  8) run_action_by_id "validate-project" ;;
  9) run_action_by_id "validate-appimage" ;;
  10) run_action_by_id "validate-appimage-extract" ;;
  11) run_action_by_id "doctor" ;;
  *) ;;
esac
}
menu_maint(){ cat <<'M'
Maintenance & Uninstall
1) Clean generated artifacts
2) Reset user data
3) Uninstall Native Install
4) Uninstall Flatpak Install
5) Fix build directory permissions
6) Purge all installations and user data
0) Back
M
if ! c="$(ui_read_choice "Choose an option: ")"; then return; fi
case "$c" in
  1) run_action_by_id "clean" ;;
  2) run_action_by_id "reset-user-data" ;;
  3) run_action_by_id "uninstall-native" ;;
  4) run_action_by_id "uninstall-flatpak" ;;
  5) run_action_by_id "fix-build-permissions" ;;
  6) run_action_by_id "purge" ;;
  *) ;;
esac
}
run_interactive_mode(){ [[ -t 0 ]] || { show_help; exit 0; }; while true; do print_main_screen; if ! c="$(ui_read_choice "Choose an option: ")"; then ui_info "No input detected."; exit 0; fi; case "$c" in 1) menu_install;;2) menu_dev;;3) menu_maint;;4) show_help;;5) if [[ "${CANVA_NO_TUI:-0}" == "1" ]]; then ui_warn "CANVA_NO_TUI=1 is set. Unset it to use the TUI Tool."; else run_tui_mode no; return $?; fi;;0) exit 0;;*) ui_warn "Unknown option: $c";; esac; done; }

if [[ $# -eq 0 ]]; then
  if [[ "${CANVA_NO_TUI:-0}" == "1" ]]; then
    run_interactive_mode
    exit 0
  fi
  if [[ "${CANVA_TUI:-0}" == "1" ]]; then
    run_tui_mode no
    exit 0
  fi
  run_tui_mode yes
  exit 0
fi
for arg in "$@"; do case "$arg" in -y|--yes|--force) FORCE=true;; esac; done
for arg in "$@"; do
  case "$arg" in
    --help|-h) show_help; exit 0 ;;
    --tui) run_tui_mode no; exit 0 ;;
    --no-tui) run_interactive_mode ;;
    -y|--yes|--force) ;;
    --install-native) run_action_by_cli_flag "$arg" ;;
    --install-flatpak|--install) run_action_by_cli_flag "$arg" ;;
    --build-runtime) run_action_by_cli_flag "$arg" ;;
    --build-dir) run_action_by_cli_flag "$arg" ;;
    --validate) run_action_by_cli_flag "$arg" ;;
    --validate-appimage) run_action_by_cli_flag "$arg" ;;
    --validate-appimage-extract) run_action_by_cli_flag "$arg" ;;
    --doctor) run_action_by_cli_flag "$arg" ;;
    --bundle-flatpak|--bundle) run_action_by_cli_flag "$arg" ;;
    --bundle-appimage) run_action_by_cli_flag "$arg" ;;
    --bundle-deb|--bundle-rpm|--prepare-aur) run_action_by_cli_flag "$arg" ;;
    --clean) run_action_by_cli_flag "$arg" ;;
    --uninstall) run_action_by_cli_flag "$arg" ;;
    --uninstall-native) run_action_by_cli_flag "$arg" ;;
    --uninstall-flatpak) run_action_by_cli_flag "$arg" ;;
    --reset-user-data) run_action_by_cli_flag "$arg" ;;
    --purge) run_action_by_cli_flag "$arg" ;;
    *) ui_error "Unknown option: $arg"; exit 1 ;;
  esac
done
