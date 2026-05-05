#!/usr/bin/env bash
set -euo pipefail

BOLD=""; DIM=""; RESET=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; MAGENTA=""; CYAN=""; UI_PRIMARY=""; UI_SECONDARY=""; UI_ACCENT=""; UI_SUCCESS=""; UI_WARNING=""; UI_ERROR=""; UI_DIVIDER_CHAR="="

supports_color() {
  [[ -t 1 ]] || return 1
  [[ -z "${NO_COLOR:-}" ]] || return 1
  [[ "${TERM:-dumb}" != "dumb" ]] || return 1
}

ui_init() {
  if supports_color; then
    BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
    RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; MAGENTA=$'\033[35m'; CYAN=$'\033[36m'
    UI_PRIMARY="${BLUE}"; UI_SECONDARY="${CYAN}"; UI_ACCENT="${MAGENTA}"; UI_SUCCESS="${BLUE}"; UI_WARNING="${YELLOW}"; UI_ERROR="${RED}"
    UI_DIVIDER_CHAR='━'
  fi
}

ui_divider(){ local line; printf -v line "%*s" 48 ""; printf '%s\n' "${line// /${UI_DIVIDER_CHAR}}"; }
ui_title(){ ui_divider; printf '%s%s%s\n' "${BOLD}" "$1" "${RESET}"; [[ $# -gt 1 ]] && printf '%s%s%s\n' "${DIM}" "$2" "${RESET}"; ui_divider; }
ui_section(){ printf '\n%s%s%s\n' "${BOLD}${UI_PRIMARY}" "$1" "${RESET}"; }
ui_subsection(){ printf '%s%s%s\n' "${BOLD}${UI_ACCENT}" "$1" "${RESET}"; }
ui_info(){ printf '%s[info]%s %s\n' "${UI_SECONDARY}" "${RESET}" "$*"; }
ui_ok(){ printf '%s[ok]%s %s\n' "${UI_SUCCESS}" "${RESET}" "$*"; }
ui_warn(){ printf '%s[warn]%s %s\n' "${UI_WARNING}" "${RESET}" "$*"; }
ui_error(){ printf '%s[error]%s %s\n' "${UI_ERROR}" "${RESET}" "$*" >&2; }
ui_planned(){ printf '%s[planned]%s %s\n' "${UI_ACCENT}" "${RESET}" "$*"; }
ui_dim(){ printf '%s%s%s\n' "${DIM}" "$*" "${RESET}"; }
ui_cmd(){ printf '  %s%s%s\n' "${BOLD}${UI_SUCCESS}" "$*" "${RESET}"; }
ui_prompt(){ printf '%s[info]%s %s' "${UI_SECONDARY}" "${RESET}" "$*"; }
ui_read_choice(){ local prompt="${1:-Choose an option: }" choice; ui_prompt "$prompt" >&2; if ! read -r choice; then printf '\n' >&2; return 1; fi; printf '%s\n' "$choice"; }
ui_logo(){
  printf '%s' "${BOLD}${UI_PRIMARY}"
  cat <<'LOGO'
┌──────────────────────────────┐
│ .::==++**########**++==:::.  │
│ .:=+*#%%%%%%%%%%%%%%%%#*+=:. │
│ :=*#%%%%#*++==++*#%%%%#*=:   │
│ =*#%%%#+-:::::::::-+#%%%#*=  │
│ +#%%%*-::::::::::::-*%%%#+   │
│ *%%%#-::: CANVA LINUX :::#*  │
│ +#%%%*-::::::::::::-*%%%#+   │
│ =*#%%%#+-:::::::::-+#%%%#*=  │
│ :=*#%%%%#*++==++*#%%%%#*=:   │
│ .:=+*#%%%%%%%%%%%%%%%%#*+=:. │
│ .::==++**########**++==:::.  │
└──────────────────────────────┘
LOGO
  printf '%s' "${RESET}"
}
ui_version_line(){ local version="$1" phase="$2"; printf '%sVersion:%s %s%s%s\n' "${DIM}" "${RESET}" "${BOLD}${UI_SUCCESS}" "${version}" "${RESET}"; printf '%sPhase:%s   %s%s%s\n' "${DIM}" "${RESET}" "${BOLD}${UI_WARNING}" "${phase}" "${RESET}"; }

ui_die(){ ui_error "$*"; exit 1; }
