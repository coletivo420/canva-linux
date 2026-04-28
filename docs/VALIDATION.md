# Validation Guide

## Validation requirements

The canonical validation command is:

```bash
./canva-linux.sh --validate
```

It requires:

- Node.js >= 22
- npm
- Git
- Bash

Flatpak validation additionally requires:

- flatpak
- org.flatpak.Builder runtime (for `flatpak run --command=... org.flatpak.Builder` checks)

Desktop and AppStream validation use:

- desktop-file-validate
- appstreamcli

Flathub source validation may require:

- curl
- sha256sum
- tar

## Validation flow

```text
1. npm run build:preload
2. npm run lint
3. npm run typecheck
4. npm test
5. npm run docs:check-links
6. desktop-file-validate, if available
7. appstreamcli validate --explain, if available
8. ./scripts/validate-flatpak.sh
9. ./scripts/validate-flathub-submission.sh
10. git diff --check
```

## Baseline diagnostics (before editing)

```bash
git status
npm run lint
npm test
./scripts/validate-flatpak.sh
```

## GPU validation

Host checks:

```bash
ls -l /dev/dri || true

for f in /sys/class/drm/card*/device/vendor; do
  [ -r "$f" ] && echo "$f: $(cat "$f")"
done

flatpak --gl-drivers
```

Sandbox checks:

```bash
flatpak run --command=sh io.github.PirateMaryRead.canva-linux -c '
ls -l /dev/dri || true
cat /.flatpak-info | grep -E "app-extensions|runtime-extensions|Instance" || true
'
```

Runtime checks:

```bash
CANVA_GPU_BACKEND=auto CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=opengl CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=vulkan CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=software CANVA_DEBUG=gpu flatpak run io.github.PirateMaryRead.canva-linux
```

Log checks:

```bash
grep -n "feature-status" ~/.var/app/io.github.PirateMaryRead.canva-linux/config/*/logs/gpu.log 2>/dev/null || true
grep -n "launcher-report" ~/.var/app/io.github.PirateMaryRead.canva-linux/config/*/logs/gpu.log 2>/dev/null || true
```

Note: The exact `userData` path can vary; the app logs `gpu-log-file` to show the active location.
