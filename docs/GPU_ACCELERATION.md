# GPU acceleration

Canva Linux 1.4.11-dev.4 enables GPU acceleration by default when a DRI render node is available.

## Runtime modes

- `CANVA_GPU_BACKEND=auto`: default accelerated mode without forcing ANGLE/OpenGL.
- `CANVA_GPU_BACKEND=opengl`: force ANGLE/OpenGL.
- `CANVA_GPU_BACKEND=vulkan`: experimental Vulkan/ANGLE mode.
- `CANVA_GPU_BACKEND=software`: explicit software fallback.
- `CANVA_GPU_BACKEND=force`: accelerated test mode with GPU blocklist ignored.

## GPU logs

GPU diagnostics are part of the central Canva Linux log:

```text
logs/current.log
```

Use:

```bash
CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
```

Expected GPU entries:

- `launcher-report vendor=`
- `runtime-env backend=`
- `feature-status acceleration=`

Module-specific debug selection, such as `CANVA_DEBUG=gpu`, is no longer supported.
See `docs/DEBUGGING.md`.

## Backend checks

```bash
CANVA_GPU_BACKEND=auto CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=opengl CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=vulkan CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=software CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
```
