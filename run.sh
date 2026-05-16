#!/bin/sh
# run.sh - Canva Linux launcher inside Flatpak.

export CHROME_DESKTOP=io.github.coletivo420.canva-linux.desktop

runtime_debug_level() {
  level="0"
  for arg in "$@"; do
    case "$arg" in
      --debug=1) level="1" ;;
      --debug=2) level="2" ;;
      --debug|--debug=*)
        echo "canva-linux: error: Unsupported --debug value. Use --debug=1 or --debug=2." >&2
        exit 1
        ;;
    esac
  done
  echo "$level"
}

runtime_gpu_backend() {
  backend="auto"
  for arg in "$@"; do
    case "$arg" in
      --gpu-backend=*) backend="${arg#--gpu-backend=}" ;;
      --gpu-backend)
        echo "canva-linux: error: unsupported --gpu-backend value" >&2
        exit 1
        ;;
    esac
  done
  echo "$backend"
}

has_runtime_flag() {
  needle="$1"
  shift
  for arg in "$@"; do
    [ "$arg" = "$needle" ] && return 0
  done
  return 1
}

RUNTIME_DEBUG_LEVEL="$(runtime_debug_level "$@")"

debug_enabled() {
  [ "${RUNTIME_DEBUG_LEVEL:-0}" = "1" ] || [ "${RUNTIME_DEBUG_LEVEL:-0}" = "2" ]
}

launcher_log() {
  debug_enabled || return 0
  echo "canva-linux:gpu:launcher $*" >&2
}

detect_gpu_vendor() {
  for vendor_file in /sys/class/drm/card*/device/vendor; do
    [ -r "$vendor_file" ] || continue
    vendor="$(cat "$vendor_file" 2>/dev/null || true)"

    case "$vendor" in
      0x8086) echo "intel"; return 0 ;;
      0x1002|0x1022) echo "amd"; return 0 ;;
      0x10de) echo "nvidia"; return 0 ;;
      0x1a03|0x1234|0x1af4) echo "virtual"; return 0 ;;
    esac
  done

  echo "unknown"
}

has_dri_render_node() {
  [ -e /dev/dri/renderD128 ] && return 0
  ls /dev/dri/renderD* >/dev/null 2>&1
}

detect_display_server() {
  if [ -n "${WAYLAND_DISPLAY:-}" ] || [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
    echo "wayland"
    return 0
  fi

  if [ -n "${DISPLAY:-}" ] || [ "${XDG_SESSION_TYPE:-}" = "x11" ]; then
    echo "x11"
    return 0
  fi

  echo "unknown"
}

if [ "$RUNTIME_DEBUG_LEVEL" = "2" ]; then
  set -- \
    --enable-logging=stderr \
    --log-level=0 \
    "$@"
fi

DISPLAY_SERVER="$(detect_display_server)"
GPU_VENDOR="$(detect_gpu_vendor)"
GPU_BACKEND="$(runtime_gpu_backend "$@")"

if has_dri_render_node; then
  GPU_DRI_RENDER_NODE=1
else
  GPU_DRI_RENDER_NODE=0
fi

if has_runtime_flag --force-x11 "$@"; then
  unset GDK_BACKEND
  DISPLAY_SERVER="x11"
  set -- --ozone-platform=x11 "$@"
elif has_runtime_flag --force-wayland "$@"; then
  if [ "$DISPLAY_SERVER" != "wayland" ]; then
    echo "canva-linux: error: --force-wayland was set, but no Wayland session was detected." >&2
    exit 1
  fi
  set -- --ozone-platform=wayland "$@"
elif [ "$DISPLAY_SERVER" = "wayland" ]; then
  set -- --ozone-platform=wayland "$@"
fi

if has_runtime_flag --disable-wayland-color-manager "$@"; then
  set -- \
    --disable-features=WaylandWpColorManagerV1 \
    "$@"
fi

if [ "$GPU_DRI_RENDER_NODE" = "0" ] && [ "$GPU_BACKEND" != "software" ]; then
  launcher_log "no DRI render node found; switching to software fallback"
  GPU_BACKEND="software"
fi

case "$GPU_BACKEND" in
  auto)
    set -- \
      --enable-gpu-rasterization \
      --enable-zero-copy \
      "$@"
    ;;

  opengl)
    set -- \
      --enable-gpu-rasterization \
      --enable-zero-copy \
      --use-gl=angle \
      --use-angle=gl \
      "$@"
    ;;

  vulkan)
    set -- \
      --enable-gpu-rasterization \
      --enable-zero-copy \
      --enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan \
      --use-angle=vulkan \
      "$@"
    ;;

  force)
    set -- \
      --enable-gpu-rasterization \
      --enable-zero-copy \
      --ignore-gpu-blocklist \
      --use-gl=angle \
      --use-angle=gl \
      "$@"
    ;;

  software)
    export CANVA_DISABLE_GPU=1
    set -- \
      --disable-gpu \
      --disable-gpu-compositing \
      "$@"
    ;;

  *)
    echo "canva-linux: error: invalid --gpu-backend='$GPU_BACKEND'" >&2
    echo "canva-linux: valid values: auto, opengl, vulkan, software, force" >&2
    exit 1
    ;;
esac

export CANVA_GPU_VENDOR="$GPU_VENDOR"
export CANVA_GPU_DRI_RENDER_NODE="$GPU_DRI_RENDER_NODE"
export CANVA_GPU_DISPLAY_SERVER="$DISPLAY_SERVER"
export CANVA_GPU_LAUNCHER_REPORT="vendor=$GPU_VENDOR backend=$GPU_BACKEND dri=$GPU_DRI_RENDER_NODE display=$DISPLAY_SERVER"

launcher_log "$CANVA_GPU_LAUNCHER_REPORT"

exec zypak-wrapper.sh /app/main/canva-linux \
  --class=io.github.coletivo420.canva-linux \
  --disable-gpu-sandbox \
  "$@"
