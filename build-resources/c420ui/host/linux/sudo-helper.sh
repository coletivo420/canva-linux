#!/usr/bin/env bash
set -euo pipefail

C420UI_ROOT_AUTH="${C420UI_ROOT_AUTH:-0}"
C420UI_ACTION_SCOPE="${C420UI_ACTION_SCOPE:-}"
C420UI_SUDO_TIMEOUT_SECONDS="${C420UI_SUDO_TIMEOUT_SECONDS:-30}"

c420ui_is_non_interactive_root_mode() {
  [[ "${C420UI_ROOT_AUTH}" == "1" ]]
}

c420ui_sudo_timeout() {
  if command -v timeout >/dev/null 2>&1; then
    timeout --foreground "${C420UI_SUDO_TIMEOUT_SECONDS}s" "$@"
  else
    "$@"
  fi
}

c420ui_sudo_error() {
  local status="$1"
  case "${status}" in
    124) echo "[error] sudo authorization timed out after ${C420UI_SUDO_TIMEOUT_SECONDS}s." >&2 ;;
    *)
      if c420ui_is_non_interactive_root_mode; then
        echo "[error] sudo credentials are not cached for non-interactive root mode." >&2
        echo "[error] Re-run the action and complete administrator authentication before privileged writes." >&2
      else
        echo "[error] sudo authorization failed or was canceled." >&2
      fi
      ;;
  esac
}

c420ui_assert_not_user_scope() {
  if [[ "${C420UI_ACTION_SCOPE}" == "user" ]]; then
    echo "[error] Refusing to run sudo while a user-scope action is active." >&2
    echo "[error] Check C420UI_ACTION_SCOPE and use non-privileged helpers for user scope." >&2
    return 1
  fi
}

c420ui_sudo_validate() {
  c420ui_assert_not_user_scope
  # c420ui pre-validates credentials before backend execution.
  # With C420UI_ROOT_AUTH=1, root validation must only
  # accept cached sudo credentials and must not prompt from the child process.
  local status=0
  if c420ui_is_non_interactive_root_mode; then
    c420ui_sudo_timeout sudo -n -v || status=$?
  else
    c420ui_sudo_timeout sudo -v || status=$?
  fi
  if [[ "$status" -ne 0 ]]; then
    c420ui_sudo_error "$status"
    return "$status"
  fi
}

c420ui_sudo_validate_stdin() {
  c420ui_assert_not_user_scope
  local password
  local output
  local status=0

  password="$(cat)"
  if [[ -z "${password}" ]]; then
    echo "sudo: no password was provided" >&2
    return 1
  fi

  output="$(printf '%s\n' "${password}" | c420ui_sudo_timeout sudo -S -v -p "" 2>&1)" || status=$?
  if [[ "${status}" -eq 0 ]]; then
    password=""
    return 0
  fi

  password=""
  if [[ "${status}" -eq 124 ]]; then
    c420ui_sudo_error "${status}"
    return 1
  fi

  if [[ -n "${output}" ]]; then
    printf '%s\n' "${output}" >&2
  else
    echo "sudo: a password is required" >&2
  fi
  return 1
}

c420ui_sudo() {
  c420ui_assert_not_user_scope
  c420ui_sudo_validate
  local status=0
  if c420ui_is_non_interactive_root_mode; then
    c420ui_sudo_timeout sudo -n "$@" || status=$?
  else
    c420ui_sudo_timeout sudo "$@" || status=$?
  fi
  if [[ "$status" -ne 0 ]]; then
    c420ui_sudo_error "$status"
    return "$status"
  fi
}

c420ui_sudo_rm() { c420ui_sudo rm "$@"; }
c420ui_sudo_mkdir() { c420ui_sudo mkdir "$@"; }
c420ui_sudo_cp() { c420ui_sudo cp "$@"; }
c420ui_sudo_chmod() { c420ui_sudo chmod "$@"; }
c420ui_sudo_ln() { c420ui_sudo ln "$@"; }
c420ui_sudo_flatpak() { c420ui_sudo flatpak "$@"; }
c420ui_sudo_chown() { c420ui_sudo chown "$@"; }
c420ui_sudo_install() { c420ui_sudo install "$@"; }

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  case "${1:-}" in
    --validate) c420ui_sudo_validate ;;
    --validate-stdin) c420ui_sudo_validate_stdin ;;
    *) echo "Usage: $0 --validate|--validate-stdin" >&2; exit 2 ;;
  esac
fi
