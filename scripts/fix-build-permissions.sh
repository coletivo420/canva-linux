#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REAL_USER="${SUDO_USER:-${USER}}"
TARGET_UID="$(id -u "${REAL_USER}")"
TARGET_GID="$(id -g "${REAL_USER}")"
ALLOWED=(".build" "dist" "build-dir" "repo" ".flatpak-builder")
cd "${ROOT_DIR}"
for dir in "${ALLOWED[@]}"; do
  [[ -e "$dir" ]] || continue
  if [[ -L "$dir" ]]; then
    echo "[warn] Skipping symlink: $dir"
    continue
  fi
  sudo chown -R "${TARGET_UID}:${TARGET_GID}" "$dir"
  echo "[ok] Restored ownership: $dir"
done
echo "[ok] Permission fix completed."
