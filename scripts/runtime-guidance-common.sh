#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ui-common.sh"
ui_init
print_debug_guidance_for_command(){
  local run_cmd="$1"
  ui_section "Run"
  ui_cmd "${run_cmd}"
  echo
  ui_subsection "Internal Canva Linux logs"
  ui_cmd "CANVA_DEBUG=1 ${run_cmd}"
  ui_info "Shows all internal Canva Linux diagnostics, including startup, session, tabs, toolbar, permissions, uploads, OAuth, drag-and-drop, eyedropper, preload and GPU acceleration monitoring."
  ui_cmd "CANVA_DEBUG=2 ${run_cmd}"
  ui_info "Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron stderr logs."
  echo
  print_display_backend_guidance "${run_cmd}"
  echo
  print_gpu_backend_guidance "${run_cmd}"
}
print_native_post_install_guidance(){ ui_ok "Native Install completed."; echo; print_debug_guidance_for_command "canva-linux"; }
print_flatpak_post_install_guidance(){ print_debug_guidance_for_command "flatpak run io.github.coletivo420.canva-linux"; }
print_display_backend_guidance(){ local run_cmd="$1"; ui_subsection "Display backend checks"; ui_cmd "CANVA_FORCE_WAYLAND=1 ${run_cmd}"; ui_cmd "CANVA_FORCE_X11=1 ${run_cmd}"; }
print_gpu_backend_guidance(){ local run_cmd="$1"; ui_subsection "GPU backend checks"; ui_cmd "CANVA_GPU_BACKEND=auto ${run_cmd}"; ui_cmd "CANVA_GPU_BACKEND=opengl ${run_cmd}"; ui_cmd "CANVA_GPU_BACKEND=vulkan ${run_cmd}"; ui_cmd "CANVA_GPU_BACKEND=software ${run_cmd}"; }
print_debugging_docs_guidance(){ ui_info "See docs/DEBUGGING.md."; }
print_appimage_guidance(){ local appimage="$1"; ui_section "AppImage notes"; ui_info "AppImage is not sandboxed by Flatpak."; ui_info "AppImage execution may require FUSE support."; ui_info "See docs/APPIMAGE_FUSE.md."; echo; print_debug_guidance_for_command "${appimage}"; }
