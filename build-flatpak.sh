#!/usr/bin/env bash
set -euo pipefail

echo "[warn] build-flatpak.sh is deprecated. Use ./canva-linux.sh instead." >&2
exec "$(dirname "$0")/canva-linux.sh" "$@"
