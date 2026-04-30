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
- GPU diagnostics
- navigation classification
- window-open policy
- OAuth popup boundaries
- shell/window helpers
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

## DEV8 TypeScript boundary validation

Run:

```bash
npm run typecheck
npm run typecheck:strict
node --test test/navigation.test.js
node --test test/window-open-policy.test.js
node --test test/oauth-helpers.test.js
```

This validates:

- shared navigation classification
- main-process window-open policy
- OAuth popup state helpers
- shell/OAuth boundary type safety

## DEV9 preload and installer validation

Run:

```bash
npm run build:preload
npm run typecheck
npm run typecheck:strict
node --test test/preload-debug.test.js
node --test test/upload-diagnostics.test.js
node --test test/eyedropper-preload.test.js
bash -n scripts/install-flatpak-local.sh
```

Validate post-install output manually after:

```bash
./canva-linux.sh --install
```

Expected behavior:

- section titles are highlighted in interactive terminals;
- commands are highlighted;
- output remains readable without colors;
- colors are disabled when `NO_COLOR=1`;
- no module-specific `CANVA_DEBUG=gpu` style commands appear.

## DEV10 strict main-process validation

Run:

```bash
npm run typecheck
npm run typecheck:strict
npm test
```

DEV10 expands strict checking to remaining extracted main-process modules:

- runtime
- logging
- logging helpers
- IPC
- lifecycle
- tabs
- tab controller
- tab events
- eyedropper bridge

Run targeted tests:

```bash
node --test test/runtime.test.js
node --test test/logging-helpers.test.js
node --test test/tabs-state.test.js
node --test test/eyedropper-bridge.test.js
```

## Changelog-backed regression validation

Before removing or simplifying behavior, search `CHANGELOG.md`.

If the behavior appears in `CHANGELOG.md`, it is protected unless the maintainer explicitly requested the change.
