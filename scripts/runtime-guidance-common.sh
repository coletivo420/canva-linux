#!/usr/bin/env bash
set -euo pipefail
print_debug_guidance_for_command(){
  local run_cmd="$1"
  echo "Run:"
  echo "  ${run_cmd}"
  echo
  echo "Internal Canva Linux logs:"
  echo "  CANVA_DEBUG=1 ${run_cmd}"
  echo "    Shows all internal Canva Linux diagnostics, including startup, session,"
  echo "    tabs, toolbar, permissions, uploads, OAuth, drag-and-drop, eyedropper,"
  echo "    preload and GPU acceleration monitoring."
  echo "  CANVA_DEBUG=2 ${run_cmd}"
  echo "    Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron stderr logs."
  echo
  echo "Display backend checks:"
  echo "  CANVA_FORCE_WAYLAND=1 ${run_cmd}"
  echo "  CANVA_FORCE_X11=1 ${run_cmd}"
  echo
  echo "GPU backend checks:"
  echo "  CANVA_GPU_BACKEND=auto ${run_cmd}"
  echo "  CANVA_GPU_BACKEND=opengl ${run_cmd}"
  echo "  CANVA_GPU_BACKEND=vulkan ${run_cmd}"
  echo "  CANVA_GPU_BACKEND=software ${run_cmd}"
}
print_native_post_install_guidance(){ echo "Native Install completed."; echo; print_debug_guidance_for_command "canva-linux"; }
print_flatpak_post_install_guidance(){ print_debug_guidance_for_command "flatpak run io.github.coletivo420.canva-linux"; }
print_display_backend_guidance(){ local run_cmd="$1"; echo "Display backend checks:"; echo "  CANVA_FORCE_WAYLAND=1 ${run_cmd}"; echo "  CANVA_FORCE_X11=1 ${run_cmd}"; }
print_gpu_backend_guidance(){ local run_cmd="$1"; echo "GPU backend checks:"; echo "  CANVA_GPU_BACKEND=auto ${run_cmd}"; echo "  CANVA_GPU_BACKEND=opengl ${run_cmd}"; echo "  CANVA_GPU_BACKEND=vulkan ${run_cmd}"; echo "  CANVA_GPU_BACKEND=software ${run_cmd}"; }
print_debugging_docs_guidance(){ echo "See docs/DEBUGGING.md."; }
print_appimage_guidance(){ local appimage="$1"; echo "AppImage notes:"; echo "  AppImage is not sandboxed by Flatpak."; echo "  AppImage execution may require FUSE support."; echo "  See docs/APPIMAGE_FUSE.md."; echo; print_debug_guidance_for_command "${appimage}"; }
