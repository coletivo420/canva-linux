#!/bin/bash
# scripts/install-flatpak-local.sh - Build and install Canva Flatpak locally for development/testing.
set -euo pipefail

## Console helpers
supports_color() {
  [[ -t 1 ]] || return 1
  [[ -z "${NO_COLOR:-}" ]] || return 1
  [[ "${TERM:-dumb}" != "dumb" ]] || return 1
}

if supports_color; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  RESET="$(printf '\033[0m')"

  RED="$(printf '\033[31m')"
  GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"
  BLUE="$(printf '\033[34m')"
  MAGENTA="$(printf '\033[35m')"
  CYAN="$(printf '\033[36m')"
else
  BOLD=""
  DIM=""
  RESET=""

  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  MAGENTA=""
  CYAN=""
fi

info()  { printf '%s[info]%s %s\n' "${YELLOW}" "${RESET}" "$*"; }
ok()    { printf '%s[ok]%s  %s\n' "${GREEN}" "${RESET}" "$*"; }
warn()  { printf '%s[warn]%s %s\n' "${YELLOW}" "${RESET}" "$*"; }
err()   { printf '%s[error]%s %s\n' "${RED}" "${RESET}" "$*" >&2; exit 1; }

section() {
  printf '\n%s%s%s\n' "${BOLD}${CYAN}" "$1" "${RESET}"
}

cmd() {
  printf '  %s%s%s\n' "${BOLD}${GREEN}" "$1" "${RESET}"
}

note() {
  printf '    %s%s%s\n' "${DIM}" "$1" "${RESET}"
}

doc_path() {
  printf '  %s%s%s\n' "${BOLD}${BLUE}" "$1" "${RESET}"
}

print_post_install_guidance() {
  section "Run commands:"
  cmd "flatpak run io.github.PirateMaryRead.canva-linux"

  section "Internal Canva Linux logs:"
  cmd "CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux"
  note "Shows all internal Canva Linux diagnostics, including startup, session,"
  note "tabs, toolbar, permissions, uploads, OAuth, drag-and-drop, eyedropper,"
  note "preload and GPU acceleration monitoring."

  printf '\n'
  cmd "CANVA_DEBUG=2 flatpak run io.github.PirateMaryRead.canva-linux"
  note "Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron"
  note "stderr logs."

  section "Display backend checks:"
  cmd "CANVA_FORCE_WAYLAND=1 flatpak run io.github.PirateMaryRead.canva-linux"
  cmd "CANVA_FORCE_X11=1 flatpak run io.github.PirateMaryRead.canva-linux"

  section "GPU backend checks:"
  cmd "CANVA_GPU_BACKEND=auto flatpak run io.github.PirateMaryRead.canva-linux"
  cmd "CANVA_GPU_BACKEND=opengl flatpak run io.github.PirateMaryRead.canva-linux"
  cmd "CANVA_GPU_BACKEND=vulkan flatpak run io.github.PirateMaryRead.canva-linux"
  cmd "CANVA_GPU_BACKEND=software flatpak run io.github.PirateMaryRead.canva-linux"

  section "Debugging documentation:"
  doc_path "docs/DEBUGGING.md"

  section "Optional bundle generation:"
  cmd "./scripts/build-flatpak-bundle.sh"

  printf '\n'
}

## Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/flatpak-build-common.sh"

## Usage
usage() {
  cat <<'USAGE'
Usage:
  ./scripts/install-flatpak-local.sh [--skip-npm]

Options:
  --skip-npm   Skip npm install + npm run dist (requires existing dist/linux-unpacked)
USAGE
}

## Flags
SKIP_NPM=false
for arg in "$@"; do
  case "$arg" in
    --skip-npm)
      SKIP_NPM=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      err "Unknown argument: $arg"
      ;;
  esac
done

## Dependency checks
require_command flatpak
require_command flatpak-builder

if [[ "$SKIP_NPM" == false ]]; then
  require_command npm
  require_node_major 22
fi

VERSION="$(detect_package_version)"
info "Preparing local Flatpak install for Canva Linux v${VERSION}"
ok "Host dependencies are available"

## Flathub runtime preparation
ensure_flathub_runtime

## Node/Electron build preparation
if [[ "$SKIP_NPM" == false ]]; then
  build_electron_output
else
  warn "Skipping npm install + npm run dist (--skip-npm)"
fi

## Build output checks
ensure_linux_unpacked

## Local install/reinstall (direct install path)
install_flatpak_direct

## Post-install instructions
print_post_install_guidance
