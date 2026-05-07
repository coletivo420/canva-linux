#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ui-common.sh"
ui_init

print_flatpak_bundle_notice() {
  ui_section "Long-running package generation"
  ui_info ".flatpak package generation may take several minutes depending on your system."
  ui_info "The process may need to build the Electron runtime."
  ui_info "It also prepares Flatpak metadata, updates the local repository, compresses the bundle, and validates outputs."
  ui_info "Please be patient and keep this terminal open until the process finishes."
  echo
}

print_appimage_bundle_notice() {
  ui_section "Long-running package generation"
  ui_info "AppImage package generation may take several minutes depending on your system."
  ui_info "The process may need to build the Electron runtime and run electron-builder."
  ui_info "It also compresses the artifact, generates checksums, and validates outputs."
  ui_info "Please be patient and keep this terminal open until the process finishes."
  echo
}
