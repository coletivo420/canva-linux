#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"
remove_path_safely(){
  local target="$1"
  [[ -e "$target" ]] || return 0
  if rm -rf "$target" 2>/dev/null; then echo "[ok] Removed $target"; return 0; fi
  echo "[warn] Could not remove $target as current user; retrying with administrator authorization."
  sudo rm -rf "$target"
  echo "[ok] Removed $target"
}
for p in .build dist build-dir repo .flatpak-builder; do remove_path_safely "$p"; done
