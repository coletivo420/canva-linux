#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/preflight-common.sh"

require_command node
require_command npm
require_node_major 22

if [[ ! -d node_modules ]]; then
  if [[ -f package-lock.json ]]; then
    echo "[info] node_modules missing; running npm ci"
    npm ci
  else
    echo "[info] node_modules missing; running npm install"
    npm install
  fi
fi

echo "[info] Building AppImage with electron-builder"
npm run dist:appimage

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage' | sort)
if (( ${#appimages[@]} == 0 )); then
  echo "[error] No AppImage artifact was generated under dist/" >&2
  exit 1
fi

for artifact in "${appimages[@]}"; do
  chmod +x "${artifact}"
  size_bytes="$(stat -c '%s' "${artifact}")"
  echo "[ok] AppImage generated: ${artifact} (${size_bytes} bytes)"
done

cat <<'GUIDANCE'

AppImage notes:
  AppImage is a portable package and does not use the Flatpak sandbox.
  Depending on the distribution, running AppImage files may require FUSE support.

Run:
  ./dist/<artifact>.AppImage

Debug:
  CANVA_DEBUG=1 ./dist/<artifact>.AppImage
  CANVA_DEBUG=2 ./dist/<artifact>.AppImage

Display backend checks:
  CANVA_FORCE_WAYLAND=1 ./dist/<artifact>.AppImage
  CANVA_FORCE_X11=1 ./dist/<artifact>.AppImage

GPU backend checks:
  CANVA_GPU_BACKEND=auto ./dist/<artifact>.AppImage
  CANVA_GPU_BACKEND=opengl ./dist/<artifact>.AppImage
  CANVA_GPU_BACKEND=vulkan ./dist/<artifact>.AppImage
  CANVA_GPU_BACKEND=software ./dist/<artifact>.AppImage
GUIDANCE
