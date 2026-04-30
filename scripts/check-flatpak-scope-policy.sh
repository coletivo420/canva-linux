#!/usr/bin/env bash
set -euo pipefail

failed=false
remote_user_pattern="remote-add --if-not-exists --""user flathub"
install_user_pattern="flatpak install .*--""user flathub"
builder_user_install_pattern="flatpak-builder .*--""user .*--install"
sudo_builder_pattern="sudo[[:space:]]\\+flatpak-""builder"
scope_prefix_name="flatpak_scope_""prefix"
scope_prefix_builder_pattern="${scope_prefix_name}).*flatpak-builder\\|"'$('"${scope_prefix_name}"')[[:space:]]\+flatpak-builder'
file_repo_pattern="file:""//.*repo"

if grep -RIn "${remote_user_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flathub remote"
  failed=true
fi

if grep -RIn "${install_user_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flathub install"
  failed=true
fi

if grep -RIn "${builder_user_install_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden unconditional user Flatpak install"
  failed=true
fi

if grep -RIn "${sudo_builder_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden sudo flatpak-""builder"
  failed=true
fi

if grep -RIn "${scope_prefix_builder_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden flatpak_scope_prefix with flatpak-builder"
  failed=true
fi

if grep -RIn "${file_repo_pattern}" scripts canva-linux.sh; then
  echo "[flatpak-scope] forbidden file:""// local Flatpak repo remote"
  failed=true
fi

for workflow_script in \
  scripts/install-flatpak-local.sh \
  scripts/build-flatpak-bundle.sh \
  scripts/run-flatpak-dev.sh; do
  if ! grep -q "trap 'restore_flatpak_build_artifact_permissions || true' EXIT" "${workflow_script}"; then
    echo "[flatpak-scope] missing Flatpak artifact ownership restore trap: ${workflow_script}"
    failed=true
  fi
done

if ! grep -RIn "CANVA_FLATPAK_SCOPE" scripts canva-linux.sh >/dev/null; then
  echo "[flatpak-scope] CANVA_FLATPAK_SCOPE is not documented in scripts"
  failed=true
fi

if [[ "$failed" == true ]]; then
  exit 1
fi

echo "[flatpak-scope] OK"
