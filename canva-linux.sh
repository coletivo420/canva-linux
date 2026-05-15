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
DRY_RUN=false

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


c420ui_bootstrap_npm_dependencies_available() {
  [[ -x "${ROOT_DIR}/node_modules/.bin/esbuild" ]] && [[ -d "${ROOT_DIR}/node_modules/blessed" ]]
}

c420ui_bootstrap_dev_dependency_version() {
  local package_name="$1"

  node -p "const p = require('./package.json'); const version = p.devDependencies && p.devDependencies['${package_name}']; version || '';"
}

ensure_c420ui_bootstrap_npm_dependencies() {
  local bootstrap_packages=(esbuild blessed)
  local package_name
  local package_version
  local install_specs=()

  if c420ui_bootstrap_npm_dependencies_available; then
    return 0
  fi

  if [[ "${C420UI_SKIP_DEPENDENCY_INSTALL:-}" == "1" ]]; then
    ui_error "c420ui bootstrap dependencies are missing and C420UI_SKIP_DEPENDENCY_INSTALL=1 is set."
    ui_info "Unset C420UI_SKIP_DEPENDENCY_INSTALL or install the bootstrap dependencies manually."
    exit 1
  fi

  if ! command -v node > /dev/null 2>&1; then
    ui_error "Node.js is required to install c420ui bootstrap dependencies."
    ui_info "Install Node.js, then retry."
    exit 1
  fi

  if ! command -v npm > /dev/null 2>&1; then
    ui_error "npm is required to install c420ui bootstrap dependencies."
    ui_info "Install npm, then retry."
    exit 1
  fi

  if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
    ui_error "Project metadata is missing: package.json."
    exit 1
  fi

  for package_name in "${bootstrap_packages[@]}"; do
    package_version="$(c420ui_bootstrap_dev_dependency_version "${package_name}")"
    if [[ -z "${package_version}" ]]; then
      ui_error "c420ui bootstrap dependency '${package_name}' is not declared in package.json devDependencies."
      exit 1
    fi
    install_specs+=("${package_name}@${package_version}")
  done

  ui_info "Installing minimal c420ui bootstrap npm dependencies: esbuild, blessed."
  npm install --no-save --package-lock=false --include=dev --ignore-scripts "${install_specs[@]}"
}

ensure_action_runner_available() {
  if command -v node > /dev/null 2>&1; then
    return 0
  fi

  ui_error "Node.js is required for c420ui CLI bridge commands."
  ui_info "Install Node.js, then retry."
  exit 1
}

source_newer_than_entrypoint() {
  local entrypoint="$1"
  local source="$2"

  [[ -e "${source}" ]] || return 0

  if [[ -d "${source}" ]]; then
    if [[ "${source}" -nt "${entrypoint}" ]] || find "${source}" -type f \( -name '*.ts' -o -name '*.json' \) -newer "${entrypoint}" | grep -q .; then
      return 0
    fi
    return 1
  fi

  [[ "${source}" -nt "${entrypoint}" ]]
}

c420ui_cli_entrypoint_is_fresh() {
  local entrypoint="${ROOT_DIR}/.build/scripts/run-c420ui-cli.js"

  [[ -s "${entrypoint}" ]] || return 1

  local source
  for source in \
    "${ROOT_DIR}/scripts/run-c420ui-cli.ts" \
    "${ROOT_DIR}/scripts/c420ui-adapter" \
    "${ROOT_DIR}/packages/c420ui/src/terminal" \
    "${ROOT_DIR}/scripts/canva-linux/actions/registry.ts" \
    "${ROOT_DIR}/scripts/canva-linux/project-root.ts" \
    "${ROOT_DIR}/scripts/canva-linux/detection" \
    "${ROOT_DIR}/packages/c420ui/src" \
    "${ROOT_DIR}/config/canva-linux/actions.json" \
    "${ROOT_DIR}/config/canva-linux/project-ui.json"
  do
    if source_newer_than_entrypoint "${entrypoint}" "${source}"; then
      return 1
    fi
  done

  return 0
}

ensure_c420ui_cli_entrypoint() {
  ensure_action_runner_available

  if c420ui_cli_entrypoint_is_fresh; then
    return 0
  fi

  ensure_c420ui_bootstrap_npm_dependencies

  CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" npm run build:scripts
}

run_action_by_cli_flag() {
  local flag="$1"
  ensure_c420ui_cli_entrypoint

  local args=("${flag}")
  if [[ "${FORCE}" == true ]]; then
    args+=(--yes)
  fi
  if [[ "${DRY_RUN}" == true ]]; then
    args+=(--dry-run)
  fi

  session_log "[action] cli=${flag}"
  if [[ "${SESSION_LOG_ENABLED}" == true ]]; then
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" \
      CANVA_TOOL_SESSION_LOG="${SESSION_LOG}" \
      CANVA_TOOL_SESSION_ID="${SESSION_ID}" \
      node .build/scripts/run-c420ui-cli.js "${args[@]}" 2>&1 | tee -a "${SESSION_LOG}"
  else
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" node .build/scripts/run-c420ui-cli.js "${args[@]}" 2>&1
  fi
}

c420ui_has_attached_stdio() {
  [[ -t 0 && -t 1 ]]
}

c420ui_has_dev_tty() {
  [[ -r /dev/tty && -w /dev/tty ]]
}

c420ui_needs_dev_tty_redirect() {
  ! c420ui_has_attached_stdio && c420ui_has_dev_tty
}

c420ui_has_entrypoint() {
  [[ -f "${ROOT_DIR}/scripts/run-c420ui.ts" ]]
}

c420ui_unavailable_reason() {
  local force="${1:-no}"

  if ! c420ui_has_attached_stdio && ! c420ui_has_dev_tty; then
    printf '%s\n' "c420ui requires an interactive terminal or an accessible /dev/tty."
    return 0
  fi

  if [[ "${TERM:-dumb}" == "dumb" ]]; then
    printf '%s\n' "c420ui requires a usable TERM value; current TERM is '${TERM:-dumb}'."
    return 0
  fi

  if ! command -v node > /dev/null 2>&1; then
    printf '%s\n' "c420ui requires Node.js, but node was not found in PATH."
    return 0
  fi

  if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
    printf '%s\n' "Project metadata is missing: package.json."
    return 0
  fi

  if ! c420ui_has_entrypoint; then
    printf '%s\n' "c420ui entrypoint is missing. Expected scripts/run-c420ui.ts."
    return 0
  fi

  return 1
}

can_run_c420ui() {
  ! c420ui_unavailable_reason "$@" > /dev/null
}

run_c420ui_entrypoint() {
  ensure_c420ui_bootstrap_npm_dependencies

  if [[ -n "${PROJECT_PHASE:-}" ]]; then
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" npm run build:scripts > /dev/null &&
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_PROJECT_PHASE="${PROJECT_PHASE}" CANVA_TOOL_SESSION_LOG="${SESSION_LOG}" CANVA_TOOL_SESSION_ID="${SESSION_ID}" node .build/scripts/run-c420ui.js
  else
    CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" npm run build:scripts > /dev/null &&
      CANVA_SCRIPT_REPO_ROOT="${ROOT_DIR}" CANVA_TOOL_SESSION_LOG="${SESSION_LOG}" CANVA_TOOL_SESSION_ID="${SESSION_ID}" node .build/scripts/run-c420ui.js
  fi
}

run_c420ui_node() {
  if c420ui_needs_dev_tty_redirect; then
    session_log "[c420ui] stdio is not a tty; redirecting c420ui to /dev/tty"
    run_c420ui_entrypoint < /dev/tty > /dev/tty 2> /dev/tty
    return $?
  fi

  run_c420ui_entrypoint
}

run_c420ui_mode() {
  local force="${1:-no}"
  local reason

  if reason="$(c420ui_unavailable_reason "${force}")"; then
    ui_error "${reason}"
    ui_info "Use ./canva-linux.sh --help to list direct CLI actions."
    exit 1
  fi

  run_c420ui_node
}

show_help() {
  cat << 'H'
Canva Linux — Install and Development Tool

Usage:
  ./canva-linux.sh
  ./canva-linux.sh [direct action] [--yes] [--dry-run]

Global options:
  -y, --yes              Non-interactive confirmation for uninstall/purge prompts
  -h, --help             Show this help
      --dry-run           Resolve action metadata without executing commands

Interactive behavior:
  ./canva-linux.sh opens the c420ui by default when available.
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
  run_c420ui_mode no
  exit 0
fi

for arg in "$@"; do
  case "${arg}" in
    -y | --yes | --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
  esac
done

DIRECT_ACTION_FLAGS=()
for arg in "$@"; do
  case "${arg}" in
    --help | -h)
      show_help
      exit 0
      ;;
    -y | --yes | --force | --dry-run)
      ;;
    *)
      DIRECT_ACTION_FLAGS+=("${arg}")
      ;;
  esac
done

if [[ $# -gt 0 ]]; then
  if [[ "${#DIRECT_ACTION_FLAGS[@]}" -gt 1 ]]; then
    ui_error "Only one direct action can be executed per invocation."
    exit 64
  fi

  if [[ "${#DIRECT_ACTION_FLAGS[@]}" -eq 1 ]]; then
    run_action_by_cli_flag "${DIRECT_ACTION_FLAGS[0]}"
    exit $?
  fi

  ui_error "No direct action was provided."
  exit 64
fi
