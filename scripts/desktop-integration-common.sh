#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-identity-common.sh"
write_desktop_file(){ local desktop_path="$1" exec_path="$2" icon_name="$3"; cat > "$desktop_path" <<DESKTOP
[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=A community opensource desktop wrapper for use with Canva
Exec=${exec_path}
Icon=${icon_name}
Terminal=false
Categories=Graphics;
StartupWMClass=${APP_ID}
DESKTOP
}
install_icon_file(){ install -Dm644 "$1" "$2"; }
install_icons(){ local src_root="$1" target_icon_root="$2"; local size src; for size in 16x16 24x24 32x32 48x48 64x64 128x128 256x256 512x512; do src=""; [[ -f "${src_root}/${size}.png" ]] && src="${src_root}/${size}.png"; [[ -z "$src" && -f "${src_root}/${size}/apps/${APP_ID}.png" ]] && src="${src_root}/${size}/apps/${APP_ID}.png"; [[ -n "$src" ]] && install_icon_file "$src" "${target_icon_root}/${size}/apps/${APP_ID}.png"; done }
update_desktop_caches(){ local scope="$1"; if command -v update-desktop-database >/dev/null 2>&1; then [[ "$scope" == system ]] && sudo update-desktop-database /usr/local/share/applications >/dev/null 2>&1 || update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true; fi; }
