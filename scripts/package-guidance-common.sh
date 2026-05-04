#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ui-common.sh"
ui_init

print_flatpak_bundle_notice() {
  ui_section "Long-running package generation"
  ui_info ".flatpak package generation may take several minutes depending on your system."
  ui_info "The process may need to build the Electron runtime, prepare Flatpak metadata, update the local repository, compress the bundle, and validate outputs."
  ui_info "Please be patient and keep this terminal open until the process finishes."
  echo
}

print_appimage_bundle_notice() {
  ui_section "Long-running package generation"
  ui_info "AppImage package generation may take several minutes depending on your system."
  ui_info "The process may need to build the Electron runtime, run electron-builder, compress the artifact, generate checksums, and validate outputs."
  ui_info "Please be patient and keep this terminal open until the process finishes."
  echo
}
