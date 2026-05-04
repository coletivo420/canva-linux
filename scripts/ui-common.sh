#!/usr/bin/env bash
set -euo pipefail

BOLD=""; DIM=""; RESET=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; MAGENTA=""; CYAN=""; UI_DIVIDER_CHAR="="

supports_color() {
  [[ -t 1 ]] || return 1
  [[ -z "${NO_COLOR:-}" ]] || return 1
  [[ "${TERM:-dumb}" != "dumb" ]] || return 1
}

ui_init() {
  if supports_color; then
    BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
    RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; MAGENTA=$'\033[35m'; CYAN=$'\033[36m'
    UI_DIVIDER_CHAR='━'
  fi
}

ui_divider(){ local line; printf -v line "%*s" 48 ""; printf '%s\n' "${line// /${UI_DIVIDER_CHAR}}"; }
ui_title(){ ui_divider; printf '%s%s%s\n' "${BOLD}" "$1" "${RESET}"; [[ $# -gt 1 ]] && printf '%s%s%s\n' "${DIM}" "$2" "${RESET}"; ui_divider; }
ui_section(){ printf '\n%s%s%s\n' "${BOLD}${CYAN}" "$1" "${RESET}"; }
ui_subsection(){ printf '%s%s%s\n' "${BOLD}${MAGENTA}" "$1" "${RESET}"; }
ui_info(){ printf '%s[info]%s %s\n' "${BLUE}" "${RESET}" "$*"; }
ui_ok(){ printf '%s[ok]%s %s\n' "${GREEN}" "${RESET}" "$*"; }
ui_warn(){ printf '%s[warn]%s %s\n' "${YELLOW}" "${RESET}" "$*"; }
ui_error(){ printf '%s[error]%s %s\n' "${RED}" "${RESET}" "$*" >&2; }
ui_planned(){ printf '%s[planned]%s %s\n' "${MAGENTA}" "${RESET}" "$*"; }
ui_dim(){ printf '%s%s%s\n' "${DIM}" "$*" "${RESET}"; }
ui_cmd(){ printf '  %s%s%s\n' "${BOLD}${GREEN}" "$*" "${RESET}"; }
ui_prompt(){ printf '%s[info]%s %s' "${BLUE}" "${RESET}" "$*"; }
ui_read_choice(){ local prompt="${1:-Choose an option: }" choice; ui_prompt "$prompt" >&2; read -r choice; printf '%s\n' "$choice"; }
