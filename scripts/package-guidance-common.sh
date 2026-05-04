#!/usr/bin/env bash
set -euo pipefail

print_flatpak_bundle_notice() {
  echo
  echo "[info] .flatpak package generation may take several minutes depending on your system."
  echo "[info] The process may need to build the Electron runtime, prepare Flatpak metadata, update the local repository, compress the bundle, and validate outputs."
  echo "[info] Please be patient and keep this terminal open until the process finishes."
  echo
}

print_appimage_bundle_notice() {
  echo
  echo "[info] AppImage package generation may take several minutes depending on your system."
  echo "[info] The process may need to build the Electron runtime, run electron-builder, compress the artifact, generate checksums, and validate outputs."
  echo "[info] Please be patient and keep this terminal open until the process finishes."
  echo
}
