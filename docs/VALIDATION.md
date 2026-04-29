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

## Debug validation

Validate internal logs:

```bash
CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
```

Expected:

- startup logs
- session logs
- GPU acceleration monitoring
- `central-log-file`
- `feature-status acceleration=`

Validate verbose Chromium/Electron logs:

```bash
CANVA_DEBUG=2 flatpak run io.github.PirateMaryRead.canva-linux
```

Unsupported module-specific debug values must not be documented as valid runtime modes:

- `CANVA_DEBUG=gpu`
- `CANVA_DEBUG=oauth`
- `CANVA_DEBUG=dnd`
- `CANVA_DEBUG=eyedropper`
- `CANVA_DEBUG=tabs`
- `CANVA_DEBUG=toolbar`
- `CANVA_DEBUG=permissions`

## GPU validation

Runtime checks:

```bash
CANVA_GPU_BACKEND=auto CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=opengl CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=vulkan CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_GPU_BACKEND=software CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
```

## TypeScript validation

Run both the broad JavaScript typecheck and the strict boundary typecheck:

```bash
npm run typecheck
npm run typecheck:strict
```

`typecheck` covers the current JavaScript project with `allowJs` and `checkJs`.

`typecheck:strict` covers the current strict TypeScript boundary:

- logging normalization
- debug levels
- related tests

## GPU diagnostics type validation

Run:

```bash
npm run typecheck:strict
node --test test/gpu-diagnostics.test.js
```

This validates:

- GPU acceleration classification
- runtime environment parsing
- GPU feature status serialization
