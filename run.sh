#!/bin/sh
# run.sh - Minimal Canva Linux launcher inside Flatpak.

export CHROME_DESKTOP=io.github.coletivo420.canva-linux.desktop

exec zypak-wrapper.sh /app/main/canva-linux \
  --class=io.github.coletivo420.canva-linux \
  --disable-gpu-sandbox \
  "$@"
