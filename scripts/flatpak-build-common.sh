#!/bin/bash
# Shared Flatpak build helpers for local install and release bundle workflows.

FLATPAK_SCOPE="${CANVA_FLATPAK_SCOPE:-system}"
FLATPAK_APP_ID="io.github.coletivo420.canva-linux"
LOCAL_FLATPAK_REMOTE="canva-linux-local"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sudo-common.sh"

validate_flatpak_scope() {
  case "${FLATPAK_SCOPE}" in
    system|user)
      ;;
    *)
      ui_die "Invalid CANVA_FLATPAK_SCOPE: ${FLATPAK_SCOPE}. Use 'system' or 'user'."
      ;;
  esac
}

flatpak_scope_arg() {
  validate_flatpak_scope
  case "${FLATPAK_SCOPE}" in
    system) printf '%s' "--system" ;;
    user) printf '%s' "--user" ;;
  esac
}

local_flatpak_repo_uri() {
  local repo_path="$1"

  node -e 'const { pathToFileURL } = require("url"); console.log(pathToFileURL(process.argv[1]).href);' "${repo_path}"
}

remove_path_safely() {
  local target="$1"

  [[ -e "${target}" ]] || return 0

  if rm -rf "${target}" 2>/dev/null; then
    return 0
  fi

  if [[ "${FLATPAK_SCOPE:-}" == "user" ]]; then
    ui_die "Could not remove ${target} as the current user; refusing sudo in user Flatpak scope. Run Fix build directory permissions first."
  fi

  ui_warn "Could not remove ${target} as the current user; retrying with administrator authorization."
  canva_sudo_rm -rf "${target}"
}

remove_flatpak_build_artifacts() {
  remove_path_safely build-dir
  remove_path_safely repo
  remove_path_safely .flatpak-builder
}

remove_flatpak_build_dir() {
  remove_path_safely build-dir
  remove_path_safely .flatpak-builder
}

restore_path_ownership() {
  local target="$1"
  local uid
  local gid
  local foreign_path

  [[ -e "${target}" ]] || return 0

  uid="$(id -u)"
  gid="$(id -g)"
  foreign_path="$(find "${target}" \( ! -uid "${uid}" -o ! -gid "${gid}" \) -print -quit 2>/dev/null || true)"

  if [[ -z "${foreign_path}" ]]; then
    return 0
  fi

  if [[ "${FLATPAK_SCOPE:-}" == "user" ]]; then
    ui_warn "Ownership restore for ${target} needs administrator authorization; refusing sudo in user Flatpak scope."
    return 0
  fi

  ui_warn "Restoring ownership for ${target} to the current user."
  canva_sudo_chown -R "${uid}:${gid}" "${target}"
}

restore_flatpak_build_artifact_permissions() {
  restore_path_ownership build-dir
  restore_path_ownership repo
  restore_path_ownership .flatpak-builder
}

ensure_flathub_runtime() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  validate_flatpak_scope

  if [[ "${FLATPAK_SCOPE}" == "system" ]]; then
    ensure_system_flatpak_authorization

    if ! flatpak remotes --system | awk '{print $1}' | grep -qx flathub; then
      ui_warn "System Flathub remote is not configured."
      ui_warn "Canva Linux installs to the system Flatpak scope by default, for all users."
      ui_warn "Adding the system Flathub remote requires administrator authorization."
      canva_sudo_flatpak remote-add --if-not-exists --system flathub \
        https://dl.flathub.org/repo/flathub.flatpakrepo
    else
      ui_info "System Flathub remote is already configured"
    fi

    ensure_system_flatpak_runtime_dependencies
    return 0
  fi

  ui_warn "Using user Flatpak scope because CANVA_FLATPAK_SCOPE=user was set."
  ui_warn "This is the only mode that installs Flatpak build dependencies in user scope."
  ui_warn "It may create a separate user Flathub remote and duplicate runtimes/apps."

  flatpak remote-add --if-not-exists "${scope_arg}" flathub \
    https://dl.flathub.org/repo/flathub.flatpakrepo

  flatpak install -y "${scope_arg}" flathub \
    org.freedesktop.Platform//25.08 \
    org.freedesktop.Sdk//25.08 \
    org.electronjs.Electron2.BaseApp//25.08

  ui_ok "Flatpak runtimes are ready in user scope"
}

ensure_system_flatpak_authorization() {
  validate_flatpak_scope
  [[ "${FLATPAK_SCOPE}" == "system" ]] || return 0

  ui_warn "Administrator authorization is required for system Flatpak installation."
  ui_warn "Canva Linux will write to the system Flatpak scope for all users."
  canva_sudo_validate
}

ensure_system_flatpak_runtime_dependencies() {
  validate_flatpak_scope
  [[ "${FLATPAK_SCOPE}" == "system" ]] || return 0

  ui_info "Ensuring required Flatpak runtimes are installed in system scope"
  canva_sudo_flatpak install -y --system flathub \
    org.freedesktop.Platform//25.08 \
    org.freedesktop.Sdk//25.08 \
    org.electronjs.Electron2.BaseApp//25.08

  ui_ok "Flatpak runtimes are ready in system scope"
}

build_electron_output() {
  ensure_npm_dependencies

  ui_info "Building Electron app (target: dir)"
  npm run dist
}

ensure_linux_unpacked() {
  local unpacked_dir

  unpacked_dir="$(find dist -maxdepth 1 -type d -name 'linux-unpacked' 2>/dev/null | head -1)"
  if [[ -z "$unpacked_dir" ]]; then
    unpacked_dir="$(find dist -maxdepth 1 -type d -name 'linux*unpacked' 2>/dev/null | head -1)"
  fi

  [[ -z "$unpacked_dir" ]] && ui_die "Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?"

  if [[ "$unpacked_dir" != "dist/linux-unpacked" ]]; then
    ui_info "Creating symlink dist/linux-unpacked -> $unpacked_dir"
    ln -sfn "$(basename "$unpacked_dir")" dist/linux-unpacked
  fi

  ui_ok "Electron build output ready: $unpacked_dir"
}

build_flatpak_repo() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  ui_info "Cleaning previous Flatpak build artifacts"
  remove_flatpak_build_artifacts

  ui_info "Building Flatpak repository using ${FLATPAK_SCOPE} dependency scope"
  flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install-deps-from=flathub \
    --repo=repo \
    build-dir \
    io.github.coletivo420.canva-linux.yml

  ui_info "Generating repository summary"
  flatpak build-update-repo --generate-static-deltas repo
}

install_flatpak_direct() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  if [[ "${FLATPAK_SCOPE}" == "system" ]]; then
    build_flatpak_repo
    install_system_flatpak_from_repo
    return 0
  fi

  ui_info "Cleaning previous Flatpak build artifacts"
  remove_flatpak_build_dir

  ui_info "Building and installing Flatpak directly in ${FLATPAK_SCOPE} scope"
  flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install \
    --install-deps-from=flathub \
    build-dir \
    io.github.coletivo420.canva-linux.yml

  ui_ok "Direct local Flatpak install completed in ${FLATPAK_SCOPE} scope"
}

install_system_flatpak_from_repo() {
  local repo_path
  local repo_uri
  repo_path="$(pwd -P)/repo"
  repo_uri="$(local_flatpak_repo_uri "${repo_path}")"

  ui_info "Configuring local system Flatpak remote: ${LOCAL_FLATPAK_REMOTE}"
  if flatpak remotes --system | awk '{print $1}' | grep -qx "${LOCAL_FLATPAK_REMOTE}"; then
    canva_sudo_flatpak remote-modify \
      --system \
      --no-gpg-verify \
      --url="${repo_uri}" \
      "${LOCAL_FLATPAK_REMOTE}"
  else
    canva_sudo_flatpak remote-add \
      --system \
      --no-gpg-verify \
      --if-not-exists \
      "${LOCAL_FLATPAK_REMOTE}" \
      "${repo_uri}"
  fi

  ui_info "Installing Canva Linux from local repo into system Flatpak scope"
  canva_sudo_flatpak install -y --system --reinstall "${LOCAL_FLATPAK_REMOTE}" "${FLATPAK_APP_ID}"

  ui_ok "Direct local Flatpak install completed in system scope"
}

run_flatpak_dev() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  ui_info "Cleaning previous Flatpak build artifacts"
  remove_flatpak_build_dir

  ui_info "Building Flatpak without installing, using ${FLATPAK_SCOPE} dependency scope"
  flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install-deps-from=flathub \
    build-dir \
    io.github.coletivo420.canva-linux.yml

  ui_info "Running app from build-dir without installing"
  flatpak-builder \
    --run \
    build-dir \
    io.github.coletivo420.canva-linux.yml \
    /app/bin/run.sh
}
