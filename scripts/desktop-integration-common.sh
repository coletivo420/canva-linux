#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app-identity-common.sh"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/packages/c420ui/host/linux/sudo-helper.sh"
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
install_icon_file(){ local scope="$1" src="$2" dst="$3"; if [[ "$scope" == "system" ]]; then c420ui_sudo_install -Dm644 "$src" "$dst"; else install -Dm644 "$src" "$dst"; fi; }
install_icons(){
  local scope="$1" src_root="$2" target_icon_root="$3"
  local size src installed_count
  installed_count=0
  for size in 16x16 24x24 32x32 48x48 64x64 128x128 256x256 512x512; do
    src=""
    [[ -f "${src_root}/${size}.png" ]] && src="${src_root}/${size}.png"
    [[ -z "$src" && -f "${src_root}/${size}/apps/${APP_ID}.png" ]] && src="${src_root}/${size}/apps/${APP_ID}.png"
    if [[ -n "$src" ]]; then
      install_icon_file "$scope" "$src" "${target_icon_root}/${size}/apps/${APP_ID}.png"
      installed_count=$((installed_count + 1))
    fi
  done
  if [[ "$installed_count" -eq 0 ]]; then
    if declare -F ui_warn >/dev/null 2>&1; then
      ui_warn "No native icon sources found under ${src_root}; continuing without installing icons."
    else
      printf '%s\n' "[warn] No native icon sources found under ${src_root}; continuing without installing icons." >&2
    fi
  fi
}
update_desktop_caches(){ local scope="$1"; if command -v update-desktop-database >/dev/null 2>&1; then if [[ "$scope" == "system" ]]; then c420ui_sudo update-desktop-database /usr/local/share/applications >/dev/null 2>&1 || true; else update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true; fi; fi; }
