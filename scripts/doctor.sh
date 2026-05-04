#!/usr/bin/env bash
set -euo pipefail
failed=0
if command -v node >/dev/null 2>&1; then
  nv="$(node -p 'process.version')"; echo "[ok] node: ${nv}"
  node -e 'const v=Number(process.versions.node.split(".")[0]);process.exit(v>=22?0:1)' || { echo "[error] Node.js >= 22 is required"; failed=1; }
else
  echo "[error] node missing"; failed=1
fi
for req in npm git; do command -v "$req" >/dev/null 2>&1 && echo "[ok] $req" || { echo "[error] $req missing"; failed=1; }; done
command -v flatpak >/dev/null 2>&1 || echo "[warn] flatpak missing — Flatpak Install and .flatpak package generation will not work"
command -v flatpak-builder >/dev/null 2>&1 || echo "[warn] flatpak-builder missing — Flatpak package generation will not work"
command -v desktop-file-validate >/dev/null 2>&1 || echo "[warn] desktop-file-validate missing — desktop metadata validation will not work"
command -v appstreamcli >/dev/null 2>&1 || echo "[warn] appstreamcli missing — AppStream validation will not work"
echo "[info] AppImage packaging: planned"
echo "[info] deb/rpm packaging: planned"
echo "[info] AUR/PKGBUILD packaging: planned"
exit $failed
