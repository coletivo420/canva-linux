#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

EXTRACT_CHECK=false
for arg in "$@"; do
  case "$arg" in
    --extract-check) EXTRACT_CHECK=true ;;
    --help|-h)
      echo "Usage: ./scripts/validate-appimage.sh [--extract-check]"
      exit 0
      ;;
    *) echo "[error] Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

mapfile -t appimages < <(find dist -maxdepth 1 -type f -name '*.AppImage' | sort)

if (( ${#appimages[@]} == 0 )); then
  echo "[error] No AppImage artifact found under dist/" >&2
  exit 1
fi

if (( ${#appimages[@]} > 1 )); then
  echo "[warn] Multiple AppImage artifacts found; validating all and using the first as canonical output"
fi

for artifact in "${appimages[@]}"; do
  if [[ ! -s "${artifact}" ]]; then
    echo "[error] AppImage artifact is empty: ${artifact}" >&2
    exit 1
  fi

  if [[ ! -x "${artifact}" ]]; then
    chmod +x "${artifact}"
    echo "[warn] Added executable permission: ${artifact}"
  fi

  echo "[ok] Valid AppImage artifact: ${artifact}"
  echo "[info] Size: $(stat -c '%s' "${artifact}") bytes"
done

echo "[info] Primary AppImage artifact: ${appimages[0]}"

if [[ -f dist/SHA256SUMS ]]; then
  if command -v sha256sum >/dev/null 2>&1; then
    echo "[info] Validating SHA256SUMS"
    (
      cd dist
      sha256sum -c SHA256SUMS
    )
    echo "[ok] SHA256SUMS validation passed"
  else
    echo "[warn] sha256sum not found; checksum validation skipped"
  fi
else
  echo "[warn] dist/SHA256SUMS not found"
fi

if [[ "$EXTRACT_CHECK" == true ]]; then
  echo "[info] Optional AppImage extraction check enabled."
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  if (
    cd "$tmpdir"
    "${appimages[0]}" --appimage-extract >/dev/null 2>&1
  ); then
    echo "[ok] AppImage extraction check passed."
  else
    echo "[warn] AppImage extraction check failed. The artifact may still run normally with FUSE."
    echo "[info] See docs/APPIMAGE_FUSE.md"
  fi
fi

echo "[info] FUSE runtime check:"
if command -v fusermount3 >/dev/null 2>&1 || command -v fusermount >/dev/null 2>&1; then
  echo "[ok] FUSE mount helper found"
else
  echo "[warn] FUSE mount helper not found. AppImage execution may fail."
  echo "[info] See docs/APPIMAGE_FUSE.md"
fi
