#!/usr/bin/env bash
set -euo pipefail
# scripts/build-flatpak-bundle.sh - Generate a distributable Flatpak bundle on demand.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

source "${SCRIPT_DIR}/ui-common.sh"
source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/flatpak-build-common.sh"
source "${SCRIPT_DIR}/package-guidance-common.sh"
source "${SCRIPT_DIR}/build-metadata-marker-common.sh"
ui_init
trap 'restore_flatpak_build_artifact_permissions || true' EXIT

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/build-flatpak-bundle.sh [--use-existing-repo]

Options:
  --use-existing-repo   Reuse repo/ instead of rebuilding it first
USAGE
}

USE_EXISTING_REPO=false
for arg in "$@"; do
  case "$arg" in
    --use-existing-repo) USE_EXISTING_REPO=true ;;
    --help|-h) usage; exit 0 ;;
    *) usage; ui_die "Unknown argument: $arg" ;;
  esac
done

require_command flatpak
require_command flatpak-builder
require_command npm
require_command node
require_command realpath
require_command stat
validate_package_version_semver

VERSION="$(detect_package_version)"
DIST_DIR="dist"
FLATPAK_ARCH="$(flatpak --default-arch)"
BUNDLE_PATH="${DIST_DIR}/canva-linux-${VERSION}-${FLATPAK_ARCH}.flatpak"

ui_info "Generating Flatpak bundle for version ${VERSION} (${FLATPAK_ARCH})"

find_flatpak_repo_ref() {
  command -v ostree >/dev/null 2>&1 || return 0

  ostree --repo=repo refs 2>/dev/null \
    | grep -E "^app/${APP_ID}/${FLATPAK_ARCH}/" \
    | sort \
    | tail -n1 || true
}

extract_flatpak_repo_build_metadata() {
  local output_path="$1"
  local ref

  command -v ostree >/dev/null 2>&1 || return 1

  ref="$(find_flatpak_repo_ref)"
  [[ -n "$ref" ]] || return 1

  ostree --repo=repo cat "$ref" /files/share/canva-linux/version > "$output_path" 2>/dev/null
  [[ -s "$output_path" ]]
}

repo_has_app_ref() {
  [[ -d repo/refs ]] && find repo/refs -type f | grep -q '/io\.github\.coletivo420\.canva-linux/'
}

if [[ "$USE_EXISTING_REPO" == true ]]; then
  repo_has_app_ref || ui_die "repo/ is missing or does not contain io.github.coletivo420.canva-linux refs"
  ui_info "Using existing repo/ directory by explicit request"
else
  print_flatpak_bundle_notice
  ensure_flathub_runtime
  build_electron_output
  ensure_linux_unpacked
  build_flatpak_repo
fi

mkdir -p "$DIST_DIR"
rm -f "$BUNDLE_PATH"
flatpak build-bundle \
  repo \
  "$BUNDLE_PATH" \
  io.github.coletivo420.canva-linux \
  --arch="${FLATPAK_ARCH}" \
  --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo

if [[ ! -s "$BUNDLE_PATH" ]]; then
  ui_die "Expected Flatpak bundle was not generated: $BUNDLE_PATH"
fi

SIZE_BYTES="$(stat -c '%s' "$BUNDLE_PATH")"
ui_ok "Bundle generated: $(realpath "$BUNDLE_PATH")"
ui_ok "Bundle size: ${SIZE_BYTES} bytes"

if [[ "$USE_EXISTING_REPO" == true ]]; then
  tmp_metadata="$(mktemp)"
  if extract_flatpak_repo_build_metadata "$tmp_metadata"; then
    write_build_metadata_sidecar_from_source "${BUNDLE_PATH}" "$tmp_metadata"
    ui_ok "Flatpak bundle metadata generated from reused repo: ${BUNDLE_PATH}.build-metadata.json"
  else
    rm -f "${BUNDLE_PATH}.build-metadata.json"
    ui_warn "Could not read build metadata from reused repo; Flatpak bundle sidecar was not generated to avoid stale checkout metadata."
  fi
  rm -f "$tmp_metadata"
else
  write_build_metadata_sidecar "${BUNDLE_PATH}"

  if [[ -f "${BUNDLE_PATH}.build-metadata.json" ]]; then
    ui_ok "Flatpak bundle metadata generated: ${BUNDLE_PATH}.build-metadata.json"
  else
    ui_warn "Build metadata not found; Flatpak bundle full version detection will fall back to artifact name."
  fi
fi

ui_ok ".flatpak package generation completed."
