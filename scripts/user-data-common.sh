#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-identity-common.sh"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/xdg-common.sh"
native_user_data_paths() {
  printf '%s\n' "$(xdg_config_home)/${APP_NAME}" "$(xdg_config_home)/canva-linux" "$(xdg_cache_home)/${APP_NAME}" "$(xdg_cache_home)/canva-linux" "$(xdg_data_home)/${APP_NAME}" "$(xdg_data_home)/canva-linux" "$(xdg_state_home)/${APP_NAME}" "$(xdg_state_home)/canva-linux"
}
flatpak_user_data_paths() { printf '%s\n' "${APP_FLATPAK_DATA_DIR}"; }
cleanup_native_user_data(){ while IFS= read -r p; do rm -rf "$p"; done < <(native_user_data_paths); }
cleanup_flatpak_user_data(){ while IFS= read -r p; do rm -rf "$p"; done < <(flatpak_user_data_paths); }
cleanup_all_user_data(){ cleanup_flatpak_user_data; cleanup_native_user_data; }
