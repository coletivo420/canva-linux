#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/runtime-guidance-common.sh"
source "${SCRIPT_DIR}/package-guidance-common.sh"
source "${SCRIPT_DIR}/ui-common.sh"
ui_init

require_command node
require_command npm
require_command sha256sum
require_node_major 22
validate_package_version_semver
ensure_npm_dependencies

VERSION="$(detect_package_version)"
DIST_DIR="dist"
APPIMAGE_ARCH="x86_64"
APPIMAGE_PATH="${DIST_DIR}/canva-linux-${VERSION}-${APPIMAGE_ARCH}.AppImage"

print_appimage_bundle_notice

ui_info "Cleaning previous AppImage artifacts"
mkdir -p "${DIST_DIR}"
rm -f "${DIST_DIR}"/*.AppImage
rm -f "${DIST_DIR}"/*.AppImage.sha256
rm -f "${DIST_DIR}"/SHA256SUMS

ui_info "Building AppImage with electron-builder"
npm run dist:appimage

if [[ ! -s "${APPIMAGE_PATH}" ]]; then
  ui_die "Expected AppImage was not generated: ${APPIMAGE_PATH}"
fi

(
  cd "${DIST_DIR}"
  sha256sum "canva-linux-${VERSION}-${APPIMAGE_ARCH}.AppImage" > SHA256SUMS
)
ui_ok "SHA256 manifest generated: ${DIST_DIR}/SHA256SUMS"

bash "${SCRIPT_DIR}/validate-appimage.sh"

print_appimage_guidance "${APPIMAGE_PATH}"
