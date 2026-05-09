#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
echo "[error] scripts/ensure-npm-dependencies.sh is no longer an active bootstrap path." >&2
echo "[error] Host dependency policy is owned by c420ui and declared in config/canva-linux/dependencies.json." >&2
exit 1
