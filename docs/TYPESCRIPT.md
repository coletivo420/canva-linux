# TypeScript Migration Plan (`1.4.11-dev.6+`)

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

- `dev7`: strict typing for GPU diagnostics and runtime environment parsing.
- `dev8`: strict typing for shell/window-open policy and OAuth popup boundaries.
- `dev9`: strict typing for preload debug/upload/eyedropper source modules.
- `dev10`: evaluate isolated `.ts` conversion only after JSDoc strict islands are stable.
