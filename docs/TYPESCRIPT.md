# TypeScript Migration Plan (`1.4.11-dev.10+`)

## Current baseline

The project currently uses TypeScript as a JavaScript type-checking layer:

- `allowJs: true`
- `checkJs: true`
- `noEmit: true`
- `strict: false`
- `npm run typecheck`

## DEV6 scope

`1.4.11-dev.6` introduces the first strict TypeScript boundary without converting the whole app to `.ts`.

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

`1.4.11-dev.7` expands the strict boundary to GPU diagnostics.

Strict boundary additions:

- `electron/main/gpu-diagnostics.js`
- `test/gpu-diagnostics.test.js`

The goal is to type GPU feature classification, runtime environment parsing, and GPU process diagnostics without changing runtime behavior.

## DEV8 scope

`1.4.11-dev.8` expands the strict TypeScript boundary to shell, navigation and OAuth popup boundaries.

Strict boundary additions:

- `electron/shared/navigation.js`
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

`1.4.11-dev.9` expands the strict boundary to preload integration modules and improves the post-install terminal guidance.

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

`1.4.11-dev.10` expands the strict TypeScript boundary to the remaining extracted main-process modules and adds changelog-backed AI non-regression rules.

Strict boundary additions:

- `electron/main/runtime.js`
- `electron/main/logging.js`
- `electron/main/logging-helpers.js`
- `electron/main/ipc.js`
- `electron/main/lifecycle.js`
- `electron/main/tabs.js`
- `electron/main/tab-controller.js`
- `electron/main/tab-events.js`
- `electron/main/eyedropper-bridge.js`

`electron/main/index.js` remains outside the strict boundary until DEV11.

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
- Do not rename public environment variables.
- Do not reintroduce module-specific `CANVA_DEBUG=gpu` style filtering.
- Prefer JSDoc typing before `.ts` conversion.

## Planned progression

- `dev11`: strict typing for `electron/main/index.js`.
- `dev12`: introduce a real TypeScript build pipeline for Electron runtime output.
- `dev13`: convert pure shared/logging helpers to `.ts`.
- `dev14`: convert main infrastructure modules to `.ts`.
- `dev15`: convert shell, tabs and OAuth modules to `.ts`.
- `dev16`: convert the main process entrypoint to `.ts`.
- `dev17`: convert preload source modules to `.ts`.
- `dev18`: decide whether to convert or isolate `electron/preload/ltcode-eyedropper.js`.
- `dev19`: convert tests, configs and Node helper scripts where safe.
- `dev20`: verify full TypeScript conversion.
- `dev21`: post-TypeScript cleanup and obsolete compatibility removal.
- `dev22`: TypeScript stabilization and release-candidate readiness.
