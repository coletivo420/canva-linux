#!/bin/bash
# Shared Flatpak build helpers for local install and release bundle workflows.

ensure_flathub_runtime() {
  info "Ensuring Flathub remote is configured"
  flatpak remote-add --if-not-exists --user flathub \
    https://dl.flathub.org/repo/flathub.flatpakrepo

  info "Ensuring required Flatpak runtimes are installed"
  flatpak install -y --user flathub \
    org.freedesktop.Platform//25.08 \
    org.freedesktop.Sdk//25.08 \
    org.electronjs.Electron2.BaseApp//25.08
  ok "Flatpak runtimes are ready"
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
  info "Cleaning previous Flatpak build artifacts"
  rm -rf build-dir repo

  info "Building Flatpak repository"
  flatpak-builder \
    --force-clean \
    --user \
    --install-deps-from=flathub \
    --repo=repo \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml

  info "Generating repository summary"
  flatpak build-update-repo --generate-static-deltas repo
}

install_flatpak_direct() {
  info "Cleaning previous Flatpak build artifacts"
  rm -rf build-dir

  info "Building and installing Flatpak directly (no repo export, no bundle)"
  flatpak-builder \
    --force-clean \
    --user \
    --install \
    --install-deps-from=flathub \
    build-dir \
    io.github.PirateMaryRead.canva-linux.yml

  ok "Direct local Flatpak install completed"
}
