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
1. npm run lint
2. npm run typecheck
3. npm run typecheck:strict
4. npm test
5. npm run docs:check-links
6. npm run docs:check-ai
7. ./scripts/check-flatpak-scope-policy.sh
8. npm run build:runtime
9. npm run build:check
10. desktop-file-validate, if available
11. appstreamcli validate --explain, if available
12. ./scripts/validate-flatpak.sh
13. ./scripts/validate-flathub-submission.sh
14. git diff --check
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

## DEV11 main orchestration validation

Run:

```bash
npm run typecheck
npm run typecheck:strict
npm test
```

DEV11 validates:

- `electron/main/index.js` no longer uses `// @ts-nocheck`;
- the main process orchestration state is typed;
- all extracted main modules remain in the strict boundary;
- runtime behavior remains unchanged.

Targeted validation:

```bash
grep -RIn "@ts-nocheck" electron/main/index.js && exit 1 || true
npm run typecheck:strict
```

## DEV11 Flatpak scope validation

Run:

```bash
./scripts/check-flatpak-scope-policy.sh
```

Expected policy:

- `./canva-linux.sh --install` uses system scope by default;
- no unconditional `flatpak remote-add --user flathub`;
- no unconditional `flatpak install --user flathub`;
- no unconditional `flatpak-builder --user --install`;
- `CANVA_FLATPAK_SCOPE=user` is the explicit opt-in for user scope;
- `./canva-linux.sh --run-dev` builds and runs without installing the app.

## DEV12 runtime build validation

Validation remains source-first.

Do not move runtime build before lint, typecheck, strict typecheck, tests, docs checks, or AI guardrails.

Recommended order:

```bash
npm run lint
npm run typecheck
npm run typecheck:strict
npm test
npm run docs:check-links
npm run docs:check-ai
./scripts/check-flatpak-scope-policy.sh
npm run build:runtime
npm run build:check
```

Expected generated files:

```text
.build/electron/main/index.js
.build/electron/preload/canva.bundle.js
.build/electron/ui/toolbar.html
.build/electron/assets/
```

Full validation:

```bash
./canva-linux.sh --validate
```

Manual runtime checks:

```bash
npm start
npm run dist
./canva-linux.sh --run-dev
./canva-linux.sh --install
./canva-linux.sh --bundle
```

## Changelog-backed regression validation

Before removing or simplifying behavior, search `CHANGELOG.md`.

If the behavior appears in `CHANGELOG.md`, it is protected unless the maintainer explicitly requested the change.
