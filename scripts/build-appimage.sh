#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/runtime-guidance-common.sh"

require_command node
require_command npm
require_node_major 22
validate_package_version_semver
ensure_npm_dependencies

echo "[info] Cleaning previous AppImage artifacts"
rm -f dist/*.AppImage dist/*.AppImage.sha256 dist/SHA256SUMS

echo "[info] Building AppImage with electron-builder"
npm run dist:appimage

bash "${SCRIPT_DIR}/validate-appimage.sh"
sha256sum dist/*.AppImage > dist/SHA256SUMS
echo "[ok] SHA256 manifest generated: dist/SHA256SUMS"

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage' | sort)

print_appimage_guidance "${appimages[0]}"
