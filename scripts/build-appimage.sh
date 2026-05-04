#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/preflight-common.sh"

require_command node
require_command npm
require_node_major 22
validate_package_version_semver
ensure_npm_dependencies

echo "[info] Cleaning previous AppImage artifacts"
rm -f dist/*.AppImage dist/*.AppImage.sha256 dist/SHA256SUMS

echo "[info] Building AppImage with electron-builder"
npm run dist:appimage

"${SCRIPT_DIR}/validate-appimage.sh"
sha256sum dist/*.AppImage > dist/SHA256SUMS
echo "[ok] SHA256 manifest generated: dist/SHA256SUMS"

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage' | sort)

cat <<'GUIDANCE'

AppImage notes:
  AppImage is a portable package and does not use the Flatpak sandbox.
  Depending on the distribution, running AppImage files may require FUSE support.

Run:
  ${appimages[0]}

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
