#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/native-install-common.sh"

validate_native_scope
resolve_native_paths

if [[ "${NATIVE_SCOPE}" == "system" ]]; then
  cat <<MSG
A Instalação Nativa será feita no escopo system.
O app ficará disponível para todos os usuários desta máquina.
Será solicitada autorização de administrador para gravar em /opt, /usr/local/bin e /usr/local/share.
MSG
else
  cat <<MSG
A Instalação Nativa será feita no escopo user.
O app ficará disponível apenas para o usuário atual.
Não deve ser necessária autorização de administrador.
MSG
fi

"${SCRIPT_DIR}/build-electron-dir.sh"
install_native_from_dist "${REPO_ROOT}/dist/linux-unpacked"
write_desktop_file "${NATIVE_PREFIX}/canva-linux"
install_native_icons "${REPO_ROOT}/build-resources/icons/hicolor"

echo "Instalação Nativa concluída."
echo
echo "A Instalação Nativa roda fora do sandbox Flatpak."
echo "Ela usa as permissões normais do usuário que executa o aplicativo."
echo
echo "Para executar:"
echo "  canva-linux"
echo
