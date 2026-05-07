#!/usr/bin/env bash
set -euo pipefail
xdg_config_home() { printf '%s\n' "${XDG_CONFIG_HOME:-${HOME}/.config}"; }
xdg_cache_home() { printf '%s\n' "${XDG_CACHE_HOME:-${HOME}/.cache}"; }
xdg_data_home() { printf '%s\n' "${XDG_DATA_HOME:-${HOME}/.local/share}"; }
xdg_state_home() { printf '%s\n' "${XDG_STATE_HOME:-${HOME}/.local/state}"; }
