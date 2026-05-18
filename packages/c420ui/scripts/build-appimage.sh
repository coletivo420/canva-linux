#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ROOT_SCRIPT_DIR="${REPO_ROOT}/scripts"
cd "${REPO_ROOT}"

source "${ROOT_SCRIPT_DIR}/preflight-common.sh"
source "${ROOT_SCRIPT_DIR}/runtime-guidance-common.sh"
source "${ROOT_SCRIPT_DIR}/package-guidance-common.sh"
source "${ROOT_SCRIPT_DIR}/ui-common.sh"
source "${ROOT_SCRIPT_DIR}/build-metadata-marker-common.sh"
ui_init

require_command node
require_command npm
require_command sha256sum
validate_package_version_semver

VERSION="$(detect_package_version)"
DIST_DIR="dist"

print_appimage_bundle_notice

ui_info "Cleaning previous AppImage artifacts"
mkdir -p "${DIST_DIR}"
rm -f "${DIST_DIR}"/*.AppImage
rm -f "${DIST_DIR}"/*.AppImage.sha256

ui_info "Building AppImage with electron-builder"
npm run dist:appimage

shopt -s nullglob
appimage_candidates=("${DIST_DIR}/canva-linux-${VERSION}-"*.AppImage)
shopt -u nullglob

if [[ "${#appimage_candidates[@]}" -ne 1 ]]; then
  ui_die "Expected exactly one generated AppImage matching ${DIST_DIR}/canva-linux-${VERSION}-*.AppImage, found ${#appimage_candidates[@]}"
fi

APPIMAGE_PATH="${appimage_candidates[0]}"
APPIMAGE_SHA256_PATH="${APPIMAGE_PATH}.sha256"

if [[ ! -s "${APPIMAGE_PATH}" ]]; then
  ui_die "Expected AppImage was not generated: ${APPIMAGE_PATH}"
fi

(
  cd "${DIST_DIR}"
  sha256sum "$(basename "${APPIMAGE_PATH}")" > "$(basename "${APPIMAGE_SHA256_PATH}")"
)
ui_ok "AppImage checksum generated: ${APPIMAGE_SHA256_PATH}"

write_build_metadata_sidecar "${APPIMAGE_PATH}"

if [[ -f "${APPIMAGE_PATH}.build-metadata.json" ]]; then
  ui_ok "AppImage metadata generated: ${APPIMAGE_PATH}.build-metadata.json"
else
  ui_warn "Build metadata not found; AppImage full version detection will fall back to artifact name."
fi

bash "${ROOT_SCRIPT_DIR}/validate-appimage.sh" --skip-release-manifest

print_appimage_guidance "${APPIMAGE_PATH}"
