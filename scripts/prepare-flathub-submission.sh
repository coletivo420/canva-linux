#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[prepare] Regenerating Flathub npm dependency sources"
./packaging/flathub/scripts/generate-npm-sources.sh

echo "[prepare] Running submission-path validation"
./scripts/validate-flathub-submission.sh

echo "[prepare] Done. Submission assets are refreshed and validated."
