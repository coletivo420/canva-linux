#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/preflight-common.sh"

cd "${REPO_ROOT}"

failed=0
if command -v node >/dev/null 2>&1; then
  nv="$(node -p 'process.version')"; echo "[ok] node: ${nv}"
  node -e 'const v=Number(process.versions.node.split(".")[0]);process.exit(v>=22?0:1)' || { echo "[error] Node.js >= 22 is required"; failed=1; }
else
  echo "[error] node missing"; failed=1
fi
for req in npm git; do command -v "$req" >/dev/null 2>&1 && echo "[ok] $req" || { echo "[error] $req missing"; failed=1; }; done

if [[ ! -d node_modules ]]; then
  echo "[warn] node_modules missing — run: npm ci --include=dev"
else
  for dep in "${CANVA_REQUIRED_NPM_DEPS[@]}"; do
    if check_npm_dependency "$dep"; then
      echo "[ok] npm dependency: $dep"
    else
      echo "[warn] npm dependency missing: $dep — run: npm ci --include=dev"
    fi
  done
fi

command -v flatpak >/dev/null 2>&1 || echo "[warn] flatpak missing — Flatpak Install and .flatpak package generation will not work"
command -v flatpak-builder >/dev/null 2>&1 || echo "[warn] flatpak-builder missing — Flatpak package generation will not work"
command -v desktop-file-validate >/dev/null 2>&1 || echo "[warn] desktop-file-validate missing — desktop metadata validation will not work"
command -v appstreamcli >/dev/null 2>&1 || echo "[warn] appstreamcli missing — AppStream validation will not work"
echo "[info] AppImage packaging: experimental"
echo "[info] AppImage command: ./canva-linux.sh --bundle-appimage"
echo "[info] AppImage runtime may require FUSE support on some distributions"
if command -v fusermount3 >/dev/null 2>&1; then
  echo "[ok] fusermount3 found"
elif command -v fusermount >/dev/null 2>&1; then
  echo "[ok] fusermount found"
else
  echo "[warn] fusermount/fusermount3 not found — AppImage execution may require FUSE support"
  echo "[info] See docs/APPIMAGE_FUSE.md"
fi
echo "[info] deb/rpm packaging: planned"
echo "[info] AUR/PKGBUILD packaging: planned"
exit $failed
