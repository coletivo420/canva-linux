# GPU acceleration

Canva Linux 1.4.11-dev.4 enables GPU acceleration by default when a DRI render node is available.

## Runtime modes

- `--gpu-backend=auto`: default accelerated mode without forcing ANGLE/OpenGL.
- `--gpu-backend=opengl`: force ANGLE/OpenGL.
- `--gpu-backend=vulkan`: experimental Vulkan/ANGLE mode.
- `--gpu-backend=software`: explicit software fallback.
- `--gpu-backend=force`: accelerated test mode with GPU blocklist ignored.

## GPU logs

GPU diagnostics are part of the central Canva Linux log:

```text
logs/current.log
```

Use:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

Expected GPU entries:

- `launcher-report vendor=`
- `runtime-env backend=`
- `feature-status acceleration=`

Module-specific debug selection, such as `--debug=gpu`, is no longer supported.
See `docs/DEBUGGING.md`.

## Backend checks

```bash
flatpak run io.github.coletivo420.canva-linux --gpu-backend=auto --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=opengl --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=vulkan --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=software --canva-debug=1
```

## TypeScript validation

GPU diagnostics are part of the strict TypeScript boundary starting in `1.4.11-dev.7`.

Validate with:

```bash
npm run typecheck:strict
npm test
```
