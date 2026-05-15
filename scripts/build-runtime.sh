#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/preflight-common.sh"

require_command node
require_command npm
validate_package_version_semver

npm run build:runtime
