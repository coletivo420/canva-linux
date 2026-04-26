#!/usr/bin/env bash
set -euo pipefail

## Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ID="com.canva.Linux"
INSTALL_SCRIPT="${SCRIPT_DIR}/scripts/install-flatpak-local.sh"
BUNDLE_SCRIPT="${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh"
VALIDATE_SCRIPT="${SCRIPT_DIR}/scripts/validate-flatpak.sh"

## Help
show_help() {
  cat <<'HELP'
Canva-Linux — Flatpak Workflow

Usage:
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
  ./canva-linux.sh --install --bundle
  ./canva-linux.sh --bundle --install
  ./canva-linux.sh --reset-user-data --install
  ./canva-linux.sh --uninstall --reset-user-data

Action compatibility:
  --uninstall can only be combined with --reset-user-data.
  Duplicate actions are rejected.
HELP
}

## Actions
action_install() {
  "${INSTALL_SCRIPT}"
}

action_bundle() {
  "${BUNDLE_SCRIPT}"
}

action_validate() {
  "${VALIDATE_SCRIPT}"
}

action_uninstall() {
  flatpak kill "${APP_ID}" 2>/dev/null || true

  if flatpak --user info "${APP_ID}" >/dev/null 2>&1; then
    flatpak uninstall --user -y "${APP_ID}"
    echo "[ok] Uninstalled local Flatpak app: ${APP_ID}"
  else
    echo "[info] Local Flatpak app is not installed: ${APP_ID}"
  fi
}

action_reset_user_data() {
  local response
  echo "This will delete Canva-Linux user data, including login/session/cache."
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
1) Install locally
2) Build Flatpak bundle
3) Validate project
4) Install locally + build bundle
5) Reset user data
6) Uninstall local app
7) Uninstall local app + reset user data
8) Help
0) Exit
MENU

  local choice
  read -r -p "Select an option: " choice

  case "$choice" in
    1) ACTIONS=("--install") ;;
    2) ACTIONS=("--bundle") ;;
    3) ACTIONS=("--validate") ;;
    4) ACTIONS=("--install" "--bundle") ;;
    5) ACTIONS=("--reset-user-data") ;;
    6) ACTIONS=("--uninstall") ;;
    7) ACTIONS=("--uninstall" "--reset-user-data") ;;
    8)
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
      --install|--bundle|--validate|--uninstall|--reset-user-data)
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
    --install) action_install ;;
    --bundle) action_bundle ;;
    --validate) action_validate ;;
    --uninstall) action_uninstall ;;
    --reset-user-data) action_reset_user_data ;;
  esac
done
