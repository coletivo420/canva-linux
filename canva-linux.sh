#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

FORCE=false

source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/user-data-common.sh"

ui_init

SESSION_LOG="${CANVA_TOOL_SESSION_LOG:-${XDG_STATE_HOME:-$HOME/.local/state}/canva-linux/tool-session.log}"
SESSION_LOG_ENABLED=false

if mkdir -p "$(dirname "${SESSION_LOG}")" 2>/dev/null && touch "${SESSION_LOG}" 2>/dev/null; then
  SESSION_LOG_ENABLED=true
else
  SESSION_LOG="/tmp/canva-linux-tool-session.log"
  if mkdir -p "$(dirname "${SESSION_LOG}")" 2>/dev/null && touch "${SESSION_LOG}" 2>/dev/null; then
    SESSION_LOG_ENABLED=true
  fi
fi

session_log() {
  [[ "${SESSION_LOG_ENABLED}" == true ]] && printf '%s\n' "$1" >> "${SESSION_LOG}" || true
}

session_log "[session] started"
session_log "[identity] version=${PROJECT_DISPLAY_VERSION:-unknown} phase=${PROJECT_PHASE:-unknown}"
trap 'session_log "[session] ended"' EXIT

ensure_action_runner_available() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi

  ui_error "Node.js is required for shared Action Registry commands."
  ui_info "Install Node.js, then retry."
  exit 1
}

run_action_by_cli_flag() {
  local flag="$1"
  ensure_action_runner_available

  local yes_args=()
  if node scripts/action-runner.js --cli "${flag}" --requires-confirmation >/dev/null 2>&1; then
    if [[ "${FORCE}" != true ]]; then
      local answer
      read -r -p "This action requires confirmation. Continue? [y/N] " answer
      [[ "${answer}" =~ ^[Yy]$ ]] || {
        ui_info "Canceled."
        return 1
      }
    fi
    yes_args=(--yes)
  elif [[ "${FORCE}" == true ]]; then
    yes_args=(--yes)
  fi

  session_log "[action] cli=${flag}"
  if [[ "${SESSION_LOG_ENABLED}" == true ]]; then
    node scripts/action-runner.js --cli "${flag}" "${yes_args[@]}" 2>&1 | tee -a "${SESSION_LOG}"
  else
    node scripts/action-runner.js --cli "${flag}" "${yes_args[@]}" 2>&1
  fi
}

tui_unavailable_reason() {
  local force="${1:-no}"

  if [[ ! -t 0 || ! -t 1 ]]; then
    printf '%s\n' "TUI requires an interactive terminal attached to stdin and stdout."
    return 0
  fi

  if [[ "${TERM:-dumb}" == "dumb" ]]; then
    printf '%s\n' "TUI requires a usable TERM value; current TERM is '${TERM:-dumb}'."
    return 0
  fi

  if [[ "${force}" != "yes" && "${CANVA_NO_TUI:-0}" == "1" ]]; then
    printf '%s\n' "TUI is disabled by CANVA_NO_TUI=1."
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    printf '%s\n' "TUI requires Node.js, but node was not found in PATH."
    return 0
  fi

  if [[ ! -f "${ROOT_DIR}/scripts/run-tui.js" ]]; then
    printf '%s\n' "TUI launcher is missing: scripts/run-tui.js."
    return 0
  fi

  if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
    printf '%s\n' "Project metadata is missing: package.json."
    return 0
  fi

  return 1
}

can_run_tui() {
  ! tui_unavailable_reason "$@" >/dev/null
}

run_tui_mode() {
  local force="${1:-no}"
  local reason

  if reason="$(tui_unavailable_reason "${force}")"; then
    ui_error "${reason}"
    ui_info "Use ./canva-linux.sh --help to list direct CLI actions."
    exit 1
  fi

  if [[ -n "${PROJECT_PHASE:-}" ]]; then
    CANVA_PROJECT_PHASE="${PROJECT_PHASE}" node scripts/run-tui.js
  else
    node scripts/run-tui.js
  fi
}

show_help() {
  cat <<'H'
Canva Linux — Install and Development Tool

Usage:
  ./canva-linux.sh
  ./canva-linux.sh --tui
  ./canva-linux.sh [direct action] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help
  --tui                  Force Blessed TUI
  --no-tui               Deprecated compatibility flag; never opens a shell menu

Interactive behavior:
  ./canva-linux.sh opens the Blessed TUI by default when available.
  The interactive shell menu was removed. Use --help or a direct action flag.
  CANVA_NO_TUI=1 prevents automatic TUI startup and requires a direct action flag.

Installation:
  --install-native       Run Native Install
  --install-flatpak      Build and install Flatpak locally
  --install              Compatibility alias for --install-flatpak

Development:
  --build-runtime        Build compiled Electron runtime
  --build-dir            Build Electron dist/linux-unpacked output
  --validate             Run full project validation
  --validate-appimage    Validate generated AppImage artifacts
  --validate-appimage-extract
                         Validate AppImage artifacts with optional extraction check
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

show_no_tui_removed() {
  ui_warn "Interactive shell menu was removed."
  ui_info "Use ./canva-linux.sh --help or run a direct action flag."
}

has_direct_action=false
for arg in "$@"; do
  case "${arg}" in
    --install-native|--install-flatpak|--install|--build-runtime|--build-dir|--validate|--validate-appimage|--validate-appimage-extract|--doctor|--bundle-flatpak|--bundle|--bundle-appimage|--bundle-deb|--bundle-rpm|--prepare-aur|--clean|--uninstall|--uninstall-native|--uninstall-flatpak|--reset-user-data|--purge)
      has_direct_action=true
      ;;
  esac
done

if [[ $# -eq 0 ]]; then
  if [[ "${CANVA_NO_TUI:-0}" == "1" ]]; then
    show_no_tui_removed
    show_help
    exit 1
  fi
  run_tui_mode no
  exit 0
fi

for arg in "$@"; do
  case "${arg}" in
    -y|--yes|--force)
      FORCE=true
      ;;
  esac
done

for arg in "$@"; do
  case "${arg}" in
    --help|-h)
      show_help
      exit 0
      ;;
    --tui)
      run_tui_mode yes
      exit 0
      ;;
    --no-tui)
      if [[ "${has_direct_action}" != true ]]; then
        show_no_tui_removed
        show_help
        exit 1
      fi
      ;;
    -y|--yes|--force)
      ;;
    --install-native|--install-flatpak|--install|--build-runtime|--build-dir|--validate|--validate-appimage|--validate-appimage-extract|--doctor|--bundle-flatpak|--bundle|--bundle-appimage|--bundle-deb|--bundle-rpm|--prepare-aur|--clean|--uninstall|--uninstall-native|--uninstall-flatpak|--reset-user-data|--purge)
      run_action_by_cli_flag "${arg}"
      ;;
    *)
      ui_error "Unknown option: ${arg}"
      exit 1
      ;;
  esac
done
