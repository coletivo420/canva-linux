#!/bin/sh
# run.sh - Canva launcher inside Flatpak.
# Default mode: prefer native Wayland when available, otherwise let Electron fall back automatically.
# User overrides: CANVA_FORCE_X11=1 or CANVA_FORCE_WAYLAND=1.

export CHROME_DESKTOP=com.canva.WebApp.desktop

DEBUG_VALUE="${CANVA_DEBUG:-}"
if [ -n "$DEBUG_VALUE" ] && [ "$DEBUG_VALUE" != "0" ] && [ "$DEBUG_VALUE" != "false" ]; then
  set -- \
    --enable-logging=stderr \
    --log-level=0 \
    "$@"
fi

WAYLAND_SESSION=0
if [ -n "${WAYLAND_DISPLAY:-}" ] || [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
  WAYLAND_SESSION=1
fi

if [ "${CANVA_FORCE_X11:-0}" = "1" ]; then
  # Hard-force X11/Xwayland for troubleshooting or user preference.
  unset GDK_BACKEND
  set -- \
    --ozone-platform=x11 \
    "$@"
elif [ "${CANVA_FORCE_WAYLAND:-0}" = "1" ]; then
  # Hard-force native Wayland when the session exposes a Wayland socket.
  if [ "$WAYLAND_SESSION" != "1" ]; then
    echo "canva-webapp: error: CANVA_FORCE_WAYLAND=1 was set, but no Wayland session was detected." >&2
    exit 1
  fi
  set -- \
    --ozone-platform=wayland \
    "$@"
fi

exec zypak-wrapper.sh /app/main/canva-webapp \
  --class=com.canva.WebApp \
  --disable-gpu-sandbox \
  "$@"
