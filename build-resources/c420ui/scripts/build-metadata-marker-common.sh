#!/usr/bin/env bash
set -euo pipefail

build_metadata_source() {
  local effective="${REPO_ROOT}/.build/canva-linux/build-metadata.effective.json"
  local committed="${REPO_ROOT}/config/canva-linux/build-metadata.json"

  if [[ -f "${effective}" ]]; then
    printf '%s\n' "${effective}"
    return 0
  fi

  printf '%s\n' "${committed}"
}

has_build_metadata_source() {
  [[ -f "$(build_metadata_source)" ]]
}

write_build_metadata_sidecar() {
  local artifact_path="$1"
  local source
  source="$(build_metadata_source)"

  [[ -f "$source" ]] || return 0
  cp "$source" "${artifact_path}.build-metadata.json"
}

write_build_metadata_sidecar_from_source() {
  local artifact_path="$1"
  local source="$2"

  [[ -f "$source" ]] || return 0
  cp "$source" "${artifact_path}.build-metadata.json"
}

install_build_metadata_marker() {
  local target="$1"
  local source
  source="$(build_metadata_source)"

  [[ -f "$source" ]] || return 0
  install -Dm644 "$source" "$target"
}

sudo_install_build_metadata_marker() {
  local target="$1"
  local source
  source="$(build_metadata_source)"

  [[ -f "$source" ]] || return 0
  c420ui_sudo install -Dm644 "$source" "$target"
}
