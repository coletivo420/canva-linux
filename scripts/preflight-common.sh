#!/usr/bin/env bash
# scripts/preflight-common.sh - Repository-check-only helpers for host tooling.

require_command() {
  local cmd="$1"
  local message="${2:-[error] '$cmd' not found. Install it before continuing.}"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}
