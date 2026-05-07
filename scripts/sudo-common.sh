#!/usr/bin/env bash
set -euo pipefail

CANVA_SUDO_TIMEOUT_SECONDS="${CANVA_SUDO_TIMEOUT_SECONDS:-30}"

canva_is_tui_mode() {
  [[ "${CANVA_C420UI_ROOT_AUTH:-0}" == "1" ]]
}

canva_sudo_timeout() {
  if command -v timeout >/dev/null 2>&1; then
    timeout --foreground "${CANVA_SUDO_TIMEOUT_SECONDS}s" "$@"
  else
    "$@"
  fi
}

canva_sudo_error() {
  local status="$1"
  case "${status}" in
    124) echo "[error] sudo authorization timed out after ${CANVA_SUDO_TIMEOUT_SECONDS}s." >&2 ;;
    *)
      if canva_is_tui_mode; then
        echo "[error] sudo credentials are not cached for non-interactive c420ui mode." >&2
        echo "[error] Re-run the action and complete administrator authentication before privileged writes." >&2
      else
        echo "[error] sudo authorization failed or was canceled." >&2
      fi
      ;;
  esac
}

canva_assert_not_user_scope() {
  if [[ "${CANVA_NATIVE_SCOPE:-}" == "user" || "${CANVA_FLATPAK_SCOPE:-}" == "user" ]]; then
    echo "[error] Refusing to run sudo while a user-scope install action is active." >&2
    echo "[error] Check CANVA_NATIVE_SCOPE/CANVA_FLATPAK_SCOPE and use non-privileged helpers for user scope." >&2
    return 1
  fi
}

canva_sudo_validate() {
  canva_assert_not_user_scope
  # c420ui pre-validates credentials before launching action-runner.
  # With CANVA_C420UI_ROOT_AUTH=1, central runner validation must only
  # accept cached sudo credentials and must not prompt from the TUI child.
  local status=0
  if canva_is_tui_mode; then
    canva_sudo_timeout sudo -n -v || status=$?
  else
    canva_sudo_timeout sudo -v || status=$?
  fi
  if [[ "$status" -ne 0 ]]; then
    canva_sudo_error "$status"
    return "$status"
  fi
}

canva_sudo_validate_stdin() {
  canva_assert_not_user_scope
  local password
  local output
  local status=0

  password="$(cat)"
  if [[ -z "${password}" ]]; then
    echo "sudo: no password was provided" >&2
    return 1
  fi

  output="$(printf '%s\n' "${password}" | canva_sudo_timeout sudo -S -v -p "" 2>&1)" || status=$?
  if [[ "${status}" -eq 0 ]]; then
    password=""
    return 0
  fi

  password=""
  if [[ "${status}" -eq 124 ]]; then
    canva_sudo_error "${status}"
    return 1
  fi

  if [[ -n "${output}" ]]; then
    printf '%s\n' "${output}" >&2
  else
    echo "sudo: a password is required" >&2
  fi
  return 1
}

canva_sudo() {
  canva_assert_not_user_scope
  canva_sudo_validate
  local status=0
  if canva_is_tui_mode; then
    canva_sudo_timeout sudo -n "$@" || status=$?
  else
    canva_sudo_timeout sudo "$@" || status=$?
  fi
  if [[ "$status" -ne 0 ]]; then
    canva_sudo_error "$status"
    return "$status"
  fi
}

canva_sudo_rm() { canva_sudo rm "$@"; }
canva_sudo_mkdir() { canva_sudo mkdir "$@"; }
canva_sudo_cp() { canva_sudo cp "$@"; }
canva_sudo_chmod() { canva_sudo chmod "$@"; }
canva_sudo_ln() { canva_sudo ln "$@"; }
canva_sudo_flatpak() { canva_sudo flatpak "$@"; }
canva_sudo_chown() { canva_sudo chown "$@"; }
canva_sudo_install() { canva_sudo install "$@"; }

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  case "${1:-}" in
    --validate) canva_sudo_validate ;;
    --validate-stdin) canva_sudo_validate_stdin ;;
    *) echo "Usage: $0 --validate|--validate-stdin" >&2; exit 2 ;;
  esac
fi
