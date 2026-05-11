#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"
source "${SCRIPT_DIR}/ui-common.sh"
source "${SCRIPT_DIR}/runtime-guidance-common.sh"
source "${SCRIPT_DIR}/preflight-common.sh"
source "${SCRIPT_DIR}/flatpak-build-common.sh"
ui_init
trap 'restore_flatpak_build_artifact_permissions || true' EXIT

usage(){ cat <<'USAGE'
Usage:
  ./scripts/install-flatpak-local.sh [--skip-electron-build]
USAGE
}

print_flatpak_scope_notice(){ [[ "${FLATPAK_SCOPE}" == "system" ]] && ui_section "System-wide Flatpak installation" || ui_section "User Flatpak installation"; }

SKIP_ELECTRON_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-electron-build) SKIP_ELECTRON_BUILD=true ;;
    --help|-h) usage; exit 0 ;;
    *) usage; ui_error "Unknown argument: $arg"; exit 1 ;;
  esac
done
require_command flatpak; require_command flatpak-builder
if [[ "$SKIP_ELECTRON_BUILD" == false ]]; then require_command npm; fi
VERSION="$(detect_package_version)"
ui_info "Preparing local Flatpak install for Canva Linux v${VERSION}"
ui_info "Flatpak scope: ${FLATPAK_SCOPE}"
ui_ok "Host dependencies are available"
print_flatpak_scope_notice
ensure_flathub_runtime
if [[ "$SKIP_ELECTRON_BUILD" == false ]]; then build_electron_output; else ui_warn "Skipping Electron build (--skip-electron-build)"; fi
ensure_linux_unpacked
install_flatpak_direct
print_flatpak_post_install_guidance || true
ui_ok "Flatpak ${FLATPAK_SCOPE} install completed"
