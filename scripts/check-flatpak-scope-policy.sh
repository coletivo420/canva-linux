#!/usr/bin/env bash
set -euo pipefail

failed=false
remote_user_pattern="remote-add --if-not-exists --""user flathub"
install_user_pattern="flatpak install .*--""user flathub"
builder_user_install_pattern="flatpak-builder .*--""user .*--install"

if grep -RIn "${remote_user_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flathub remote"
  failed=true
fi

if grep -RIn "${install_user_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flathub install"
  failed=true
fi

if grep -RIn "${builder_user_install_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flatpak install"
  failed=true
fi

if ! grep -RIn "CANVA_FLATPAK_SCOPE" scripts canva-linux.sh >/dev/null; then
  echo "[flatpak-scope] CANVA_FLATPAK_SCOPE is not documented in scripts"
  failed=true
fi

if [[ "$failed" == true ]]; then
  exit 1
fi

echo "[flatpak-scope] OK"
