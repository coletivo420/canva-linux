#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-identity-common.sh"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/xdg-common.sh"
cleanup_native_user_data(){ while IFS= read -r p; do rm -rf "$p"; done < <(native_user_data_paths); }
cleanup_flatpak_user_data(){ rm -rf "${APP_FLATPAK_DATA_DIR}"; }
cleanup_all_user_data(){ cleanup_flatpak_user_data; cleanup_native_user_data; }
