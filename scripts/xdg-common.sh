#!/usr/bin/env bash
set -euo pipefail

xdg_config_home() { printf '%s\n' "${XDG_CONFIG_HOME:-${HOME}/.config}"; }
xdg_cache_home() { printf '%s\n' "${XDG_CACHE_HOME:-${HOME}/.cache}"; }
xdg_data_home() { printf '%s\n' "${XDG_DATA_HOME:-${HOME}/.local/share}"; }
xdg_state_home() { printf '%s\n' "${XDG_STATE_HOME:-${HOME}/.local/state}"; }

native_user_data_paths() {
  printf '%s\n' \
    "$(xdg_config_home)/Canva Linux" \
    "$(xdg_config_home)/canva-linux" \
    "$(xdg_cache_home)/Canva Linux" \
    "$(xdg_cache_home)/canva-linux" \
    "$(xdg_data_home)/Canva Linux" \
    "$(xdg_data_home)/canva-linux" \
    "$(xdg_state_home)/Canva Linux" \
    "$(xdg_state_home)/canva-linux"
}
