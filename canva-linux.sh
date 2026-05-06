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
  if scripts/run-core-entry.sh action-runner --cli "${flag}" --requires-confirmation >/dev/null 2>&1; then
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
  [[ -f "${ROOT_DIR}/scripts/run-tui.ts" || -f "${ROOT_DIR}/scripts/tui/index.ts" || -f "${ROOT_DIR}/.build/scripts/tui/index.js" ]]
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


  if ! command -v node >/dev/null 2>&1; then
    printf '%s\n' "TUI requires Node.js, but node was not found in PATH."
    return 0
  fi

  if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
    printf '%s\n' "Project metadata is missing: package.json."
    return 0
  fi

  if ! tui_has_entrypoint; then
    printf '%s\n' "TUI entrypoint is missing. Expected scripts/run-tui.ts, scripts/tui/index.ts or .build/scripts/tui/index.js."
    return 0
  fi

  return 1
}

can_run_tui() {
  ! tui_unavailable_reason "$@" >/dev/null
}

ensure_tui_npm_dependencies() {
  if [[ -x "${ROOT_DIR}/scripts/ensure-npm-dependencies.sh" || -f "${ROOT_DIR}/scripts/ensure-npm-dependencies.sh" ]]; then
    bash "${ROOT_DIR}/scripts/ensure-npm-dependencies.sh"
    return $?
  fi

  if ! command -v npm >/dev/null 2>&1; then
    ui_error "TUI fallback requires npm because scripts/ensure-npm-dependencies.sh is missing."
    exit 1
  fi

  if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
    ui_info "Installing npm dependencies with npm install --include=dev"
    npm install --include=dev
  fi
}

build_tui_direct() {
  ensure_tui_npm_dependencies

  if [[ -f "${ROOT_DIR}/scripts/tui/index.ts" ]]; then
    npm run build:tui
    return $?
  fi

  if [[ -f "${ROOT_DIR}/.build/scripts/tui/index.js" ]]; then
    return 0
  fi

  ui_error "Cannot build TUI: scripts/tui/index.ts is missing."
  exit 1
}

run_built_tui() {
  local built_tui="${ROOT_DIR}/.build/scripts/tui/index.js"
  if [[ ! -f "${built_tui}" ]]; then
    ui_error "Built TUI entrypoint is missing: .build/scripts/tui/index.js"
    exit 1
  fi

  if [[ -n "${PROJECT_PHASE:-}" ]]; then
    CANVA_PROJECT_PHASE="${PROJECT_PHASE}" node "${built_tui}"
  else
    node "${built_tui}"
  fi
}

run_tui_direct() {
  session_log "[tui] scripts/run-tui.ts missing; using direct TUI bootstrap fallback"
  build_tui_direct
  run_built_tui
}

run_tui_entrypoint() {
  if [[ -f "${ROOT_DIR}/scripts/run-tui.ts" ]]; then
    if [[ -n "${PROJECT_PHASE:-}" ]]; then
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" npm run build:scripts >/dev/null && CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" node .build/scripts/run-tui.js
    else
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" npm run build:scripts >/dev/null && CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" node .build/scripts/run-tui.js
    fi
    return $?
  fi

  run_tui_direct
}

run_tui_node() {
  if tui_needs_dev_tty_redirect; then
    session_log "[tui] stdio is not a tty; redirecting TUI to /dev/tty"
    run_tui_entrypoint </dev/tty >/dev/tty 2>/dev/tty
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
  cat <<'H'
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

if [[ $# -eq 0 ]]; then
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
