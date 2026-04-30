#!/bin/bash
# Shared Flatpak build helpers for local install and release bundle workflows.

FLATPAK_SCOPE="${CANVA_FLATPAK_SCOPE:-system}"

validate_flatpak_scope() {
  case "${FLATPAK_SCOPE}" in
    system|user)
      ;;
    *)
      err "Invalid CANVA_FLATPAK_SCOPE: ${FLATPAK_SCOPE}. Use 'system' or 'user'."
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

flatpak_scope_prefix() {
  validate_flatpak_scope
  if [[ "${FLATPAK_SCOPE}" == "system" ]]; then
    printf '%s' "sudo"
  fi
}

ensure_flathub_runtime() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  info "Ensuring Flathub remote is configured in ${FLATPAK_SCOPE} scope"
  if [[ "${FLATPAK_SCOPE}" == "system" ]]; then
    sudo flatpak remote-add --if-not-exists "${scope_arg}" flathub \
      https://dl.flathub.org/repo/flathub.flatpakrepo
    info "Ensuring required Flatpak runtimes are installed in system scope"
    sudo flatpak install -y "${scope_arg}" flathub \
      org.freedesktop.Platform//25.08 \
      org.freedesktop.Sdk//25.08 \
      org.electronjs.Electron2.BaseApp//25.08
  else
    flatpak remote-add --if-not-exists "${scope_arg}" flathub \
      https://dl.flathub.org/repo/flathub.flatpakrepo
    info "Ensuring required Flatpak runtimes are installed in user scope"
    flatpak install -y "${scope_arg}" flathub \
      org.freedesktop.Platform//25.08 \
      org.freedesktop.Sdk//25.08 \
      org.electronjs.Electron2.BaseApp//25.08
  fi
  ok "Flatpak runtimes are ready in ${FLATPAK_SCOPE} scope"
}

build_electron_output() {
  if [[ ! -d node_modules ]]; then
    if [[ -f package-lock.json ]]; then
      info "node_modules missing; running npm ci"
      npm ci
    else
      info "node_modules missing; running npm install"
      npm install
    fi
  else
    info "node_modules found; skipping npm install"
  fi

  info "Building Electron app (target: dir)"
  npm run dist
}

ensure_linux_unpacked() {
  local unpacked_dir

  unpacked_dir="$(find dist -maxdepth 1 -type d -name 'linux-unpacked' 2>/dev/null | head -1)"
  if [[ -z "$unpacked_dir" ]]; then
    unpacked_dir="$(find dist -maxdepth 1 -type d -name 'linux*unpacked' 2>/dev/null | head -1)"
  fi

  [[ -z "$unpacked_dir" ]] && err "Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?"

  if [[ "$unpacked_dir" != "dist/linux-unpacked" ]]; then
    info "Creating symlink dist/linux-unpacked -> $unpacked_dir"
    ln -sfn "$(basename "$unpacked_dir")" dist/linux-unpacked
  fi

  ok "Electron build output ready: $unpacked_dir"
}

build_flatpak_repo() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  info "Cleaning previous Flatpak build artifacts"
  rm -rf build-dir repo

  info "Building Flatpak repository using ${FLATPAK_SCOPE} dependency scope"
  $(flatpak_scope_prefix) flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install-deps-from=flathub \
    --repo=repo \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml

  info "Generating repository summary"
  flatpak build-update-repo --generate-static-deltas repo
}

install_flatpak_direct() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  info "Cleaning previous Flatpak build artifacts"
  rm -rf build-dir

  info "Building and installing Flatpak directly in ${FLATPAK_SCOPE} scope"
  flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install \
    --install-deps-from=flathub \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml

  ok "Direct local Flatpak install completed in ${FLATPAK_SCOPE} scope"
}

run_flatpak_dev() {
  local scope_arg
  scope_arg="$(flatpak_scope_arg)"

  info "Cleaning previous Flatpak build artifacts"
  rm -rf build-dir

  info "Building Flatpak without installing, using ${FLATPAK_SCOPE} dependency scope"
  flatpak-builder \
    --force-clean \
    "${scope_arg}" \
    --install-deps-from=flathub \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml

  info "Running app from build-dir without installing"
  flatpak-builder \
    --run \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml \
    /app/bin/run.sh
}
