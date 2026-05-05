#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
source "${ROOT_DIR}/scripts/ui-common.sh"
source "${ROOT_DIR}/scripts/install-detection-common.sh"
ui_init
detect_installations
print_detected_installations
