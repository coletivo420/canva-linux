#!/usr/bin/env bash
set -euo pipefail
print_debug_guidance_for_command(){ local run_cmd="$1"; echo "Run:"; echo "  ${run_cmd}"; echo; echo "Internal Canva Linux logs:"; echo "  CANVA_DEBUG=1 ${run_cmd}"; echo "  CANVA_DEBUG=2 ${run_cmd}"; echo; echo "Display backend checks:"; echo "  CANVA_FORCE_WAYLAND=1 ${run_cmd}"; echo "  CANVA_FORCE_X11=1 ${run_cmd}"; echo; echo "GPU backend checks:"; echo "  CANVA_GPU_BACKEND=auto ${run_cmd}"; echo "  CANVA_GPU_BACKEND=opengl ${run_cmd}"; echo "  CANVA_GPU_BACKEND=vulkan ${run_cmd}"; echo "  CANVA_GPU_BACKEND=software ${run_cmd}"; }
print_native_post_install_guidance(){ echo "Native Install completed."; echo; print_debug_guidance_for_command "canva-linux"; }
print_flatpak_post_install_guidance(){ print_debug_guidance_for_command "flatpak run io.github.coletivo420.canva-linux"; }
print_appimage_guidance(){ local appimage="$1"; echo "AppImage notes:"; echo "  AppImage is a portable package and does not use the Flatpak sandbox."; echo "  Depending on the distribution, running AppImage files may require FUSE support."; echo; print_debug_guidance_for_command "${appimage}"; }
