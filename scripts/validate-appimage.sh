#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

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
