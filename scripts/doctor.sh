#!/usr/bin/env bash
set -euo pipefail

check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "[ok] $1"
  else
    echo "[missing] $1"
  fi
}

check node
if command -v node >/dev/null 2>&1; then
  node -e 'const v=process.versions.node.split(".")[0]; if(Number(v)<22){process.exit(1)}' || echo "[warn] node < 22"
fi
check npm
check git
check bash
check realpath
check stat
check flatpak
check flatpak-builder
check desktop-file-validate
check appstreamcli

echo "AppImage: planned"
echo "deb/rpm: planned"
echo "AUR/PKGBUILD: planned"
