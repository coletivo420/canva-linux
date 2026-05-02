# TypeScript Migration Plan (`0.1.4-dev.X`)

## Current baseline

The project currently uses TypeScript as a JavaScript type-checking layer:

- `allowJs: true`
- `checkJs: true`
- `noEmit: true`
- `strict: false`
- `npm run typecheck`

## DEV6 scope

`0.1.4-dev.6` introduces the first strict TypeScript boundary without converting the whole app to `.ts`.

Strict boundary files:

- `electron/main/logging-normalize.js`
- `electron/shared/debug.js`
- `test/logging-normalize.test.js`
- `test/debug-levels.test.js`

Validation:

```bash
npm run typecheck
npm run typecheck:strict
npm test
./canva-linux.sh --validate
```


## DEV7 scope

`0.1.4-dev.7` expands the strict boundary to GPU diagnostics.

Strict boundary additions:

- `electron/main/gpu-diagnostics.ts`
- `test/gpu-diagnostics.test.js`

The goal is to type GPU feature classification, runtime environment parsing, and GPU process diagnostics without changing runtime behavior.

## DEV8 scope

`0.1.4-dev.8` expands the strict TypeScript boundary to shell, navigation and OAuth popup boundaries.

Strict boundary additions:

- `electron/shared/navigation.ts`
- `electron/main/window-open-policy.js`
- `electron/main/shell.js`
- `electron/main/oauth.js`
- `test/navigation.test.js`
- `test/oauth-helpers.test.js`
- `test/window-open-policy.test.js`

Goals:

- Type URL/navigation classification.
- Type window-open policy outputs.
- Type OAuth popup state boundaries.
- Type shell/toolbar helper interfaces.
- Remove manual `JSON.stringify()` from OAuth logging where the central logger can safely normalize raw objects.

Runtime behavior must remain unchanged.

## DEV9 scope

`0.1.4-dev.9` expands the strict boundary to preload integration modules and improves the post-install terminal guidance.

Strict boundary additions:

- `electron/preload/debug.js`
- `electron/preload/upload-diagnostics.js`
- `electron/preload/browser-capture-diagnostics.js`
- `electron/preload/eyedropper-routing-diagnostics.js`
- `electron/preload/custom-eyedropper-flow.js`
- `electron/preload/native-eyedropper-wrapper.js`
- `test/preload-debug.test.js`
- `test/upload-diagnostics.test.js`
- `test/eyedropper-preload.test.js`

Installer UX additions:

- colorized post-install sections;
- highlighted commands;
- automatic color disable when stdout is not a TTY;
- `NO_COLOR` support.

`electron/preload/canva.js` remains the orchestration entrypoint.

`electron/preload/ltcode-eyedropper.js` remains a library-like module and will be reviewed during DEV11 cleanup.

## DEV10 scope

`0.1.4-dev.10` expands the strict TypeScript boundary to the remaining extracted main-process modules and adds changelog-backed AI non-regression rules.

Strict boundary additions:

- `electron/main/runtime.ts`
- `electron/main/logging.ts`
- `electron/main/logging-helpers.ts`
- `electron/main/ipc.ts`
- `electron/main/lifecycle.ts`
- `electron/main/tabs.js`
- `electron/main/tab-controller.js`
- `electron/main/tab-events.js`
- `electron/main/eyedropper-bridge.ts`

`electron/main/index.js` remains outside the strict boundary until DEV11.

## DEV11 scope

`0.1.4-dev.11` brings the main Electron orchestration entrypoint into the strict TypeScript boundary and corrects the local Flatpak installation scope policy.

Strict boundary additions:

- `electron/main/index.js`

Flatpak workflow additions:

- `CANVA_FLATPAK_SCOPE=system|user`
- system scope as the default local install policy
- `./canva-linux.sh --run-dev` for build-dir development runs without installing
- validation against unconditional user-scoped Flathub installs

Goals:

- remove `// @ts-nocheck` from `electron/main/index.js`;
- add `// @ts-check`;
- type the main process orchestration state with JSDoc;
- preserve runtime behavior;
- prevent duplicate user/system Flathub remotes by default;
- prepare the project for the DEV12 TypeScript build pipeline.

## DEV12 scope

`0.1.4-dev.12` introduces the real TypeScript runtime build pipeline.

Runtime source remains in:

```text
electron/
```

Compiled runtime output is generated in:

```text
.build/electron/
```

The Electron app starts from:

```text
.build/electron/main/index.js
```

DEV12 does not convert source files to `.ts` yet. It creates the build infrastructure required for safe `.ts` conversion in DEV13+.

New scripts:

```bash
npm run clean:runtime
npm run build:runtime
npm run build:check
```

Validation order remains source-first:

```text
lint -> typecheck -> strict typecheck -> tests -> docs/AI guardrails -> runtime build -> runtime build check
```

Do not move runtime build before source validation.

## DEV13 scope

`0.1.4-dev.13` begins actual `.ts` conversion with low-risk leaf modules.

Initial conversion targets:

- `electron/main/logging-normalize.ts`
- `electron/shared/debug.ts`

Rules:

- preserve CommonJS runtime behavior after build;
- do not convert Electron orchestration modules yet;
- do not convert preload entrypoints yet;
- do not change Flatpak behavior as part of type conversion;
- update tests or test helpers so converted modules remain covered.

DEV13 adds `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`, so converted runtime `.ts` modules are covered by `npm run lint` as well as `npm run typecheck`, `npm run typecheck:strict`, `npm run build:runtime`, `npm run build:check` and the runtime module tests.

DEV13 also preserves the source-mode preload bundle path after `electron/shared/debug.js` moved to `electron/shared/debug.ts`. `scripts/build-preload-bundle.js` must keep accepting `.js` module IDs because runtime `require('../shared/debug')` resolves to the bundled `electron/shared/debug.js` ID, but source mode may read and transpile the corresponding `.ts` file before embedding it.

## DEV14 scope

`0.1.4-dev.14` stabilizes the first `.ts` conversion before expanding the migration.

Goals:

- include converted `.ts` runtime files in broad `npm run typecheck`;
- keep `npm test` source-first and free of runtime build side effects;
- preserve runtime build validation as a separate explicit step;
- keep CommonJS runtime exports during the transition;
- convert `electron/shared/navigation.ts` only after the test/build strategy is stable;
- defer larger module conversion until the shared navigation boundary remains covered.

## DEV15 scope

`0.1.4-dev.15` converts main-process infrastructure modules to TypeScript.

Targets:

- `electron/main/logging.ts`
- `electron/main/logging-helpers.ts`
- `electron/main/gpu-diagnostics.ts`
- `electron/main/runtime.ts`
- `electron/main/ipc.ts`
- `electron/main/lifecycle.ts`
- `electron/main/eyedropper-bridge.ts`

Runtime behavior must remain unchanged.

## DEV16 scope

`0.1.4-dev.16` converts shell, tabs, OAuth and window-open policy modules to TypeScript.

Targets:

- `electron/main/shell.ts`
- `electron/main/oauth.ts`
- `electron/main/tabs.ts`
- `electron/main/tab-controller.ts`
- `electron/main/tab-events.ts`
- `electron/main/window-open-policy.ts`

This phase must preserve BrowserWindow, WebContentsView, toolbar, OAuth popup, external navigation, tab-state and current EyeDropper reinjection behavior.

Out of scope:

- `electron/main/index.js`
- preload modules
- CL-EyeDropper implementation
- Flatpak policy changes

## Why logging/debug first?

Logging and debug behavior are stable contracts after DEV4 and DEV5:

- `CANVA_DEBUG=1`: all internal Canva Linux logs
- `CANVA_DEBUG=2`: internal logs plus Chromium/Electron verbose logs
- one central log file: `logs/current.log`
- no module-specific public debug filters
- crash-safe argument normalization

These modules are small enough to type strictly and important enough to protect from regression.

## Migration rules

- Do not convert large Electron runtime modules to TypeScript in this phase.
- Do not emit JavaScript from TypeScript.
- Do not change preload bundle runtime behavior.
- When converting shared modules imported by preload code, keep both preload bundle modes working: source mode from `electron/` and build-output mode from `.build/electron/`.
- Do not make `npm test` run `scripts/build-runtime.js`; runtime build must remain explicit.
- Keep converted `.ts` modules covered by broad typecheck, strict typecheck, source tests, runtime build and build checks.
- Do not rename public environment variables.
- Do not reintroduce module-specific `CANVA_DEBUG=gpu` style filtering.
- Prefer JSDoc typing before `.ts` conversion.

## Planned progression

- `dev13`: convert the first pure logging/debug leaf modules to `.ts`.
- `dev14`: stabilize TypeScript source tests and convert shared navigation to `.ts`.
- `dev15`: convert main-process infrastructure modules to `.ts`.
- `dev16`: convert shell, tabs, OAuth and window-open policy modules to `.ts`.
- `dev17`: realign project versioning to the official `0.1.x` alpha line.
- `dev18`: convert the main process entrypoint to `.ts`.
- `dev19`: convert preload source modules and introduce CL-EyeDropper contracts.
- `dev20`: implement the first-party CanvaLinux EyeDropper in TypeScript.
- `dev21`: make CL-EyeDropper the default with LTCode as temporary fallback.
- `dev22`: validate full TypeScript conversion and CL-EyeDropper.
- `dev23`: remove LTCode legacy fallback and obsolete compatibility code.
- `dev24`: stabilization and release-candidate readiness.


## DEV17 scope

`0.1.4-dev.17` realigns Canva Linux versioning to the official alpha series.

Goals:

- mark Canva Linux as alpha software;
- replace active `1.4.x` development references with the `0.1.x` alpha line;
- use `0.1.4-dev.X` as the active development version format;
- preserve historical changelog context where necessary;
- avoid runtime behavior changes.

Out of scope:

- converting `electron/main/index.js`;
- converting preload modules;
- implementing CL-EyeDropper;
- changing Flatpak permissions;
- changing OAuth, tabs, GPU, logging or IPC behavior.

## DEV18 scope

`0.1.4-dev.18` converts the main Electron entrypoint to TypeScript.

Target:

- `electron/main/index.ts`

Goals:

- complete TypeScript conversion for `electron/main`;
- preserve CommonJS runtime behavior;
- preserve app startup, lifecycle, session, OAuth, tabs, toolbar, GPU diagnostics and EyeDropper bridge behavior;
- keep preload conversion deferred to DEV19.

Out of scope:

- preload conversion;
- CL-EyeDropper contracts;
- Flatpak policy changes;
- CommonJS-to-ESM migration;
- cleanup of redundant JSDoc in already-converted modules.

## DEV19 scope

`0.1.4-dev.19` converts preload source modules to TypeScript and introduces CL-EyeDropper contracts.

Targets:

- `electron/preload/canva.ts`
- `electron/preload/debug.ts`
- `electron/preload/upload-diagnostics.ts`
- `electron/preload/browser-capture-diagnostics.ts`
- `electron/preload/eyedropper-routing-diagnostics.ts`
- `electron/preload/custom-eyedropper-flow.ts`
- `electron/preload/native-eyedropper-wrapper.ts`
- `electron/preload/cl-eyedropper/types.ts`
- `electron/preload/cl-eyedropper/index.ts`

Out of scope:

- implementing CL-EyeDropper;
- replacing LTCode;
- changing the current EyeDropper runtime path;
- adding `CANVA_EYEDROPPER_IMPL`;
- changing Flatpak, OAuth or tab behavior.
