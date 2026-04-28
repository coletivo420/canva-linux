# GPU acceleration

Canva Linux 1.4.11-dev.3 enables GPU acceleration by default when a DRI render node is available.

## Runtime modes

- `CANVA_GPU_BACKEND=auto`: default accelerated OpenGL/ANGLE path.
- `CANVA_GPU_BACKEND=opengl`: force OpenGL/ANGLE.
- `CANVA_GPU_BACKEND=vulkan`: experimental Vulkan/ANGLE.
- `CANVA_GPU_BACKEND=software`: force software fallback.
- `CANVA_GPU_BACKEND=force`: accelerated path with Chromium GPU blocklist ignored.

## Logs

GPU diagnostics are written to:

- `logs/current.log`

Enable GPU logs:

```bash
CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
```

Useful commands:

```bash
flatpak --gl-drivers

flatpak run --command=sh io.github.PirateMaryRead.canva-linux -c '
ls -l /dev/dri || true
cat /.flatpak-info | grep -E "app-extensions|runtime-extensions|Instance" || true
'
```

## Troubleshooting

Force software fallback:

```bash
CANVA_GPU_BACKEND=software CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
```

Try OpenGL:

```bash
CANVA_GPU_BACKEND=opengl CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
```

Try Vulkan:

```bash
CANVA_GPU_BACKEND=vulkan CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
```
