#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ID="io.github.coletivo420.canva-linux"

show_help(){ cat <<'H'
Canva Linux — Install, Package and Build Workflow
Usage:
  ./canva-linux.sh [actions]
Installation:
  --install-native
  --install-flatpak
  --install
Native installation scope:
  CANVA_NATIVE_SCOPE=system
  CANVA_NATIVE_SCOPE=user
Flatpak installation scope:
  CANVA_FLATPAK_SCOPE=system
  CANVA_FLATPAK_SCOPE=user
Packaging:
  --bundle-flatpak
  --bundle
  --bundle-appimage      Planned
  --bundle-deb           Planned
  --bundle-rpm           Planned
  --prepare-aur          Planned
Build:
  --build-runtime
  --build-dir
Development:
  --run-flatpak-dev
  --run-dev
Validation:
  --validate
  --doctor
Maintenance:
  --clean
Uninstall:
  --uninstall
  --uninstall-native
  --uninstall-flatpak
  --reset-user-data
  --purge
H
}

run_interactive_mode(){ show_help; exit 0; }

action_uninstall_flatpak(){ flatpak kill "$APP_ID" 2>/dev/null || true; flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true; sudo flatpak uninstall --system -y "$APP_ID" 2>/dev/null || true; }
action_uninstall_native(){ "${SCRIPT_DIR}/scripts/uninstall-native.sh"; }
action_uninstall(){ echo "Instalações detectadas:"; echo "1) Remover apenas Instalação Nativa"; echo "2) Remover apenas Flatpak"; echo "3) Remover todas"; echo "0) Cancelar"; read -r -p "Escolha: " c; case "$c" in 1) "${SCRIPT_DIR}/scripts/uninstall-native.sh" all;; 2) action_uninstall_flatpak;; 3) "${SCRIPT_DIR}/scripts/uninstall-native.sh" all; action_uninstall_flatpak;; *) echo cancelado;; esac; }
action_purge(){ echo "Isso apagará login, sessão, cookies, cache e dados locais do Canva Linux."; read -r -p "Continuar? [y/N] " y; [[ "$y" =~ ^[Yy]$ ]] || exit 0; "${SCRIPT_DIR}/scripts/uninstall-native.sh" all || true; action_uninstall_flatpak || true; rm -rf "$HOME/.var/app/$APP_ID" "$HOME/.config/Canva Linux" "$HOME/.cache/Canva Linux" "$HOME/.local/share/Canva Linux"; }

if [[ $# -eq 0 ]]; then run_interactive_mode; fi
for a in "$@"; do
case "$a" in
 --help|-h) show_help; exit 0;;
 --install-native) "${SCRIPT_DIR}/scripts/install-native.sh";;
 --install-flatpak|--install) "${SCRIPT_DIR}/scripts/install-flatpak-local.sh";;
 --bundle-flatpak|--bundle) "${SCRIPT_DIR}/scripts/build-flatpak-bundle.sh";;
 --run-flatpak-dev|--run-dev) "${SCRIPT_DIR}/scripts/run-flatpak-dev.sh";;
 --build-runtime) npm run build:runtime;;
 --build-dir) "${SCRIPT_DIR}/scripts/build-electron-dir.sh";;
 --validate) "${SCRIPT_DIR}/scripts/validate-project.sh";;
 --doctor) "${SCRIPT_DIR}/scripts/doctor.sh";;
 --clean) "${SCRIPT_DIR}/scripts/clean-artifacts.sh";;
 --uninstall-native) "${SCRIPT_DIR}/scripts/uninstall-native.sh";;
 --uninstall-flatpak) action_uninstall_flatpak;;
 --uninstall) action_uninstall;;
 --reset-user-data) rm -rf "$HOME/.var/app/$APP_ID";;
 --purge) action_purge;;
 --bundle-appimage|--bundle-deb|--bundle-rpm|--prepare-aur) echo "[planned] $a";;
 *) echo "Unknown option: $a"; exit 1;;
esac
done
