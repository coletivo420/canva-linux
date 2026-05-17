#!/bin/sh
# run.sh - Minimal Canva Linux launcher inside Flatpak.

export CHROME_DESKTOP=io.github.coletivo420.canva-linux.desktop

for arg in "$@"; do
  case "$arg" in
    --debug|--debug=*)
      printf '%s\n' "Canva Linux: --debug is reserved by Electron/Node." >&2
      printf '%s\n' "Use --canva-debug=1 or --canva-debug=2 instead." >&2
      exit 64
      ;;
  esac
done

exec zypak-wrapper.sh /app/main/canva-linux \
  --class=io.github.coletivo420.canva-linux \
  --disable-gpu-sandbox \
  "$@"
