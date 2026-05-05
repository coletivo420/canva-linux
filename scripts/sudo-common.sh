#!/usr/bin/env bash
set -euo pipefail

canva_is_tui_mode() {
  [[ "${CANVA_TUI_ROOT_AUTH:-0}" == "1" ]]
}

canva_sudo_validate() {
  if canva_is_tui_mode; then
    sudo -n -v
  else
    sudo -v
  fi
}

canva_sudo() {
  if canva_is_tui_mode; then
    sudo -n "$@"
  else
    sudo "$@"
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
