#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

npm --prefix "${ROOT_DIR}" run run:ts -- packaging/flathub/scripts/generate-npm-sources.ts "$@"
