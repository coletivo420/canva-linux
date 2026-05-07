#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

ROOT_LAUNCH_GUARD_MESSAGE="Do not run Canva Linux Install and Development Tool with sudo or as root.

Run this tool as your regular user. When an operation needs administrator privileges, Canva Linux will ask for authentication only for that specific action.

Running the whole tool as root may break file ownership, user sessions, build artifacts and desktop integration."

if [[ "${EUID}" -eq 0 ]]; then
  printf '%s\n' "${ROOT_LAUNCH_GUARD_MESSAGE}" >&2
  exit 1
fi

FORCE=false

source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/user-data-common.sh"

ui_init

SESSION_LOG="${CANVA_TOOL_SESSION_LOG:-${XDG_STATE_HOME:-$HOME/.local/state}/canva-linux/tool-session.log}"
SESSION_LOG_ENABLED=false
SESSION_ID="${CANVA_TOOL_SESSION_ID:-launcher-$$-${RANDOM}}"

if mkdir -p "$(dirname "${SESSION_LOG}")" 2> /dev/null && ( : > "${SESSION_LOG}" ) 2> /dev/null; then
  SESSION_LOG_ENABLED=true
else
  SESSION_LOG="/tmp/canva-linux-tool-session.log"
  if mkdir -p "$(dirname "${SESSION_LOG}")" 2> /dev/null && ( : > "${SESSION_LOG}" ) 2> /dev/null; then
    SESSION_LOG_ENABLED=true
  fi
fi

session_log() {
  [[ "${SESSION_LOG_ENABLED}" == true ]] && printf '%s\n' "$1" >> "${SESSION_LOG}" || true
}

session_log "[session] started id=${SESSION_ID}"
session_log "[identity] version=${PROJECT_DISPLAY_VERSION:-unknown} phase=${PROJECT_PHASE:-unknown}"
trap 'session_log "[session] ended"' EXIT

ensure_action_runner_available() {
  if command -v node > /dev/null 2>&1; then
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
  if scripts/run-core-entry.sh action-runner --cli "${flag}" --requires-confirmation > /dev/null 2>&1; then
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
    scripts/run-core-entry.sh action-runner --cli "${flag}" "${yes_args[@]}" 2>&1 | tee -a "${SESSION_LOG}"
  else
    scripts/run-core-entry.sh action-runner --cli "${flag}" "${yes_args[@]}" 2>&1
  fi
}

tui_has_attached_stdio() {
  [[ -t 0 && -t 1 ]]
}

tui_has_dev_tty() {
  [[ -r /dev/tty && -w /dev/tty ]]
}

tui_needs_dev_tty_redirect() {
  ! tui_has_attached_stdio && tui_has_dev_tty
}

tui_has_entrypoint() {
  [[ -f "${ROOT_DIR}/scripts/run-tui.ts" ]]
}

tui_unavailable_reason() {
  local force="${1:-no}"

  if ! tui_has_attached_stdio && ! tui_has_dev_tty; then
    printf '%s\n' "TUI requires an interactive terminal or an accessible /dev/tty."
    return 0
  fi

  if [[ "${TERM:-dumb}" == "dumb" ]]; then
    printf '%s\n' "TUI requires a usable TERM value; current TERM is '${TERM:-dumb}'."
    return 0
  fi

  if ! command -v node > /dev/null 2>&1; then
    printf '%s\n' "TUI requires Node.js, but node was not found in PATH."
    return 0
  fi

  if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
    printf '%s\n' "Project metadata is missing: package.json."
    return 0
  fi

  if ! tui_has_entrypoint; then
    printf '%s\n' "TUI entrypoint is missing. Expected scripts/run-tui.ts."
    return 0
  fi

  return 1
}

can_run_tui() {
  ! tui_unavailable_reason "$@" > /dev/null
}

run_tui_entrypoint() {
  if [[ -n "${PROJECT_PHASE:-}" ]]; then
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" npm run build:scripts > /dev/null &&
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" CANVA_TOOL_SESSION_LOG="${SESSION_LOG}" CANVA_TOOL_SESSION_ID="${SESSION_ID}" node .build/scripts/run-tui.js
  else
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" npm run build:scripts > /dev/null &&
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_TOOL_SESSION_LOG="${SESSION_LOG}" CANVA_TOOL_SESSION_ID="${SESSION_ID}" node .build/scripts/run-tui.js
  fi
}

run_tui_node() {
  if tui_needs_dev_tty_redirect; then
    session_log "[tui] stdio is not a tty; redirecting TUI to /dev/tty"
    run_tui_entrypoint < /dev/tty > /dev/tty 2> /dev/tty
    return $?
  fi

  run_tui_entrypoint
}

run_tui_mode() {
  local force="${1:-no}"
  local reason

  if reason="$(tui_unavailable_reason "${force}")"; then
    ui_error "${reason}"
    ui_info "Use ./canva-linux.sh --help to list direct CLI actions."
    exit 1
  fi

  run_tui_node
}

show_help() {
  cat << 'H'
Canva Linux — Install and Development Tool

Usage:
  ./canva-linux.sh
  ./canva-linux.sh [direct action] [--yes]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help

Interactive behavior:
  ./canva-linux.sh opens the Blessed TUI by default when available.
  Use --help or a direct action flag to run non-interactively.
  Do not run this tool with sudo or as root. Privileged actions ask for
  administrator authentication only when needed.

Installation:
  --install-native       Run Native Install
  --install-flatpak      Build and install Flatpak locally

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

if [[ $# -eq 0 ]]; then
  run_tui_mode no
  exit 0
fi

for arg in "$@"; do
  case "${arg}" in
    -y | --yes | --force)
      FORCE=true
      ;;
  esac
done

for arg in "$@"; do
  case "${arg}" in
    --help | -h)
      show_help
      exit 0
      ;;
    -y | --yes | --force) ;;
    --install-native | --install-flatpak | --build-runtime | --build-dir | --validate | --validate-appimage | --validate-appimage-extract | --doctor | --bundle-flatpak | --bundle-appimage | --bundle-deb | --bundle-rpm | --prepare-aur | --clean | --uninstall | --uninstall-native | --uninstall-flatpak | --reset-user-data | --purge)
      run_action_by_cli_flag "${arg}"
      ;;
    *)
      ui_error "Unknown option: ${arg}"
      exit 1
      ;;
  esac
done
