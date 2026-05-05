#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"
source "${ROOT_DIR}/scripts/app-identity-common.sh"
version="$(node -p "require('./package.json').version" 2>/dev/null || printf 'unknown')"
cat <<INFO
Project phase:
  ${PROJECT_PHASE}

Package SemVer:
  ${version}

AppID:
  ${APP_ID}

Executable:
  ${APP_EXECUTABLE}

Repository:
  https://github.com/coletivo420/canva-linux
INFO
