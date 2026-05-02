#!/usr/bin/env bash
set -euo pipefail

## Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ID="io.github.coletivo420.canva-linux"
LEGACY_IDS=(
  "io.github.PirateMaryRead.canva-linux"
  "com.canva.Linux"
)
LOCAL_FLATPAK_REMOTES=(
  canva-linux-local
  canva-linux1-origin
  debug1-origin
)
INSTALL_SCRIPT="${SCRIPT_DIR}/scripts/install-flatpak-local.sh"
BUNDLE_SCRIPT="${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh"
RUN_DEV_SCRIPT="${SCRIPT_DIR}/scripts/run-flatpak-dev.sh"
VALIDATE_SCRIPT="${SCRIPT_DIR}/scripts/validate-project.sh"

## Help
show_help() {
  cat <<'HELP'
Canva Linux — Flatpak Workflow

Usage:
  ./canva-linux.sh --run-dev           Build and run from build-dir without installing
  ./canva-linux.sh --install           Build and install locally (direct install; no repo/bundle)
  ./canva-linux.sh --bundle            Generate .flatpak bundle
  ./canva-linux.sh --validate          Run validation checks
  ./canva-linux.sh --uninstall         Uninstall local Flatpak app
  ./canva-linux.sh --reset-user-data   Delete local app data/session/cache
  ./canva-linux.sh --help              Show this help

No arguments:
  Interactive mode

Chained actions:
  Actions can be chained and are executed in the order provided.

Examples:
  ./canva-linux.sh --run-dev
  ./canva-linux.sh --install --bundle
  ./canva-linux.sh --bundle --install
  ./canva-linux.sh --reset-user-data --install
  ./canva-linux.sh --uninstall --reset-user-data
  CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install

Flatpak scope:
  --install uses system scope by default.
  Set CANVA_FLATPAK_SCOPE=user for explicit user-scoped installs.

Action compatibility:
  --uninstall can only be combined with --reset-user-data.
  Duplicate actions are rejected.
HELP
}

## Actions
action_install() {
  "${INSTALL_SCRIPT}"
}

action_run_dev() {
  "${RUN_DEV_SCRIPT}"
}

action_bundle() {
  "${BUNDLE_SCRIPT}"
}

action_validate() {
  "${VALIDATE_SCRIPT}"
}

remove_flatpak_remote_if_exists() {
  local scope="$1"
  local remote="$2"

  if ! flatpak remotes "${scope}" | tail -n +2 | awk '{print $1}' | grep -qx "${remote}"; then
    return 0
  fi

  if [[ "${scope}" == "--system" ]]; then
    sudo flatpak remote-delete --force --system "${remote}"
  else
    flatpak remote-delete --force --user "${remote}"
  fi

  echo "[ok] Removed ${scope#--} Flatpak remote: ${remote}"
}

action_uninstall() {
  flatpak kill "${APP_ID}" 2>/dev/null || true

  local removed=false

  # Migration cleanup for legacy IDs
  for legacy_id in "${LEGACY_IDS[@]}"; do
    if flatpak --user info "${legacy_id}" >/dev/null 2>&1; then
      flatpak uninstall --user -y "${legacy_id}"
      echo "[ok] Uninstalled legacy user Flatpak app: ${legacy_id}"
    fi
    if flatpak --system info "${legacy_id}" >/dev/null 2>&1; then
      sudo flatpak uninstall --system -y "${legacy_id}"
      echo "[ok] Uninstalled legacy system Flatpak app: ${legacy_id}"
    fi
  done

  if flatpak --user info "${APP_ID}" >/dev/null 2>&1; then
    flatpak uninstall --user -y "${APP_ID}"
    echo "[ok] Uninstalled user Flatpak app: ${APP_ID}"
    removed=true
  fi

  if flatpak --system info "${APP_ID}" >/dev/null 2>&1; then
    sudo flatpak uninstall --system -y "${APP_ID}"
    echo "[ok] Uninstalled system Flatpak app: ${APP_ID}"
    removed=true
  fi

  if [[ "$removed" == false ]]; then
    echo "[info] Local Flatpak app is not installed: ${APP_ID}"
  fi

  for remote in "${LOCAL_FLATPAK_REMOTES[@]}"; do
    remove_flatpak_remote_if_exists --user "${remote}"
    remove_flatpak_remote_if_exists --system "${remote}"
  done
}

action_reset_user_data() {
  local response
  echo "This will delete Canva Linux user data, including login/session/cache."
  read -r -p "Continue? [y/N] " response

  if [[ "$response" != "y" && "$response" != "Y" ]]; then
    echo "[info] Reset canceled."
    return 0
  fi

  flatpak kill "${APP_ID}" 2>/dev/null || true
  rm -rf "$HOME/.var/app/${APP_ID}"
  echo "[ok] User data removed. Login state and OAuth/session cookies were deleted."
}

## Validation
validate_action_compatibility() {
  local uninstall_count="$1"
  local action_count="$2"

  if (( uninstall_count > 0 )) && (( action_count > 2 )); then
    echo "[error] Incompatible action combination: --uninstall can only be combined with --reset-user-data" >&2
    show_help
    exit 1
  fi

  if (( uninstall_count > 0 )); then
    for action in "${ACTIONS[@]}"; do
      if [[ "$action" != "--uninstall" && "$action" != "--reset-user-data" ]]; then
        echo "[error] Incompatible action combination: --uninstall can only be combined with --reset-user-data" >&2
        show_help
        exit 1
      fi
    done
  fi
}

## Interactive mode
run_interactive_mode() {
  cat <<'MENU'
1) Run dev build without installing
2) Install locally
3) Build Flatpak bundle
4) Validate project
5) Install locally + build bundle
6) Reset user data
7) Uninstall local app
8) Uninstall local app + reset user data
9) Help
0) Exit
MENU

  local choice
  read -r -p "Select an option: " choice

  case "$choice" in
    1) ACTIONS=("--run-dev") ;;
    2) ACTIONS=("--install") ;;
    3) ACTIONS=("--bundle") ;;
    4) ACTIONS=("--validate") ;;
    5) ACTIONS=("--install" "--bundle") ;;
    6) ACTIONS=("--reset-user-data") ;;
    7) ACTIONS=("--uninstall") ;;
    8) ACTIONS=("--uninstall" "--reset-user-data") ;;
    9)
      show_help
      exit 0
      ;;
    0) exit 0 ;;
    *)
      echo "[error] Invalid menu option: ${choice}" >&2
      exit 1
      ;;
  esac
}

## Argument parsing
ACTIONS=()
declare -A SEEN_ACTIONS=()
uninstall_count=0

if [[ $# -eq 0 ]]; then
  run_interactive_mode
else
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        show_help
        exit 0
        ;;
      --run-dev|--install|--bundle|--validate|--uninstall|--reset-user-data)
        if [[ -n "${SEEN_ACTIONS[$1]:-}" ]]; then
          echo "[error] Duplicate action: $1" >&2
          show_help
          exit 1
        fi

        SEEN_ACTIONS[$1]=1
        ACTIONS+=("$1")

        if [[ "$1" == "--uninstall" ]]; then
          uninstall_count=$((uninstall_count + 1))
        fi
        shift
        ;;
      *)
        echo "[error] Unknown option: $1" >&2
        show_help
        exit 1
        ;;
    esac
  done
fi

validate_action_compatibility "$uninstall_count" "${#ACTIONS[@]}"

## Execution
for action in "${ACTIONS[@]}"; do
  case "$action" in
    --run-dev) action_run_dev ;;
    --install) action_install ;;
    --bundle) action_bundle ;;
    --validate) action_validate ;;
    --uninstall) action_uninstall ;;
    --reset-user-data) action_reset_user_data ;;
  esac
done
