#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

matches=$(rg -n --glob '*.sh' '^\s*(warn|info|ok|err)\s+"' scripts canva-linux.sh || true)
[[ -z "$matches" ]] && { echo "[ok] Shell UI helper API check passed"; exit 0; }

status=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  file="${line%%:*}"
  text="${line#*:*:}"
  fn=$(sed -E 's/^\s*(warn|info|ok|err).*/\1/' <<<"$text")
  if ! rg -n "^${fn}\(\)" "$file" >/dev/null; then
    echo "[error] $line"
    status=1
  fi
done <<< "$matches"

[[ $status -eq 0 ]] && echo "[ok] Shell UI helper API check passed" || { echo "[error] Found bare helper calls without local definitions. Use ui_* helpers." >&2; exit 1; }
