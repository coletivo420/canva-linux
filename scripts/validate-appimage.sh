#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"
source "${SCRIPT_DIR}/ui-common.sh"
ui_init

EXTRACT_CHECK=false
for arg in "$@"; do
  case "$arg" in
    --extract-check) EXTRACT_CHECK=true ;;
    --help|-h)
      echo "Usage: ./scripts/validate-appimage.sh [--extract-check]"
      exit 0
      ;;
    *) ui_die "Unknown argument: $arg" ;;
  esac
done

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage' | sort)

if (( ${#appimages[@]} == 0 )); then
  ui_die "No AppImage artifact found under dist/"
fi

if (( ${#appimages[@]} > 1 )); then
  ui_warn "Multiple AppImage artifacts found; validating all and using the first as canonical output"
fi

for artifact in "${appimages[@]}"; do
  if [[ ! -s "${artifact}" ]]; then
    ui_die "AppImage artifact is empty: ${artifact}"
  fi

  if [[ ! -x "${artifact}" ]]; then
    chmod +x "${artifact}"
    ui_warn "Added executable permission: ${artifact}"
  fi

  ui_ok "Valid AppImage artifact: ${artifact}"
  ui_info "Size: $(stat -c '%s' "${artifact}") bytes"
done

ui_info "Primary AppImage artifact: ${appimages[0]}"

if [[ -f dist/SHA256SUMS ]]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ui_info "Validating SHA256SUMS"
    (
      cd dist
      sha256sum -c SHA256SUMS
    )
    ui_ok "SHA256SUMS validation passed"
  else
    ui_warn "sha256sum not found; checksum validation skipped"
  fi
else
  ui_warn "dist/SHA256SUMS not found"
fi

if [[ "$EXTRACT_CHECK" == true ]]; then
  ui_info "Optional AppImage extraction check enabled."
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  if (
    cd "$tmpdir"
    "${appimages[0]}" --appimage-extract >/dev/null 2>&1
  ); then
    ui_ok "AppImage extraction check passed."
  else
    ui_warn "AppImage extraction check failed. The artifact may still run normally with FUSE."
    ui_info "See docs/APPIMAGE_FUSE.md"
  fi
fi

ui_info "FUSE runtime check:"
if command -v fusermount3 >/dev/null 2>&1 || command -v fusermount >/dev/null 2>&1; then
  ui_ok "FUSE mount helper found"
else
  ui_warn "FUSE mount helper not found. AppImage execution may fail."
  ui_info "See docs/APPIMAGE_FUSE.md"
fi
