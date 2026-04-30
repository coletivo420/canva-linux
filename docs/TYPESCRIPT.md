# TypeScript Migration Plan (`1.4.11-dev.9+`)

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

- `dev10`: evaluate isolated `.ts` conversion only after JSDoc strict islands are stable.
- `dev11`: review TypeScript conversion, cleanup stale compatibility code, remove obsolete helpers, consolidate docs/tests, and revisit historical preload compatibility shims.
