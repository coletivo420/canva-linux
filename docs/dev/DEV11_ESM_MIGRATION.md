# Dev11 ESM Migration Plan

## Current CommonJS debt

- `.build/electron/**/*.js` runtime output still generated from CommonJS TypeScript config
- CommonJS assumptions around `__dirname` and `__filename`

## Source debt resolved in Dev11

- c420ui terminal `app.ts`/`modal.ts`/`runtime.ts` maintained source CommonJS debt
- Electron shared `debug.ts`/`navigation.ts` duplicate `module.exports`
- `check-runtime-build.ts` CommonJS entry guard in maintained TypeScript source
- Node tooling generated outputs moved from CommonJS `.js` to ESM `.mjs`
- Core checks generated outputs moved to ESM `.mjs`
- c420ui checks generated outputs moved to ESM `.mjs`
- c420ui terminal generated output moved to ESM `.mjs`
- TypeScript runner bootstrap moved to ESM `.mjs`
- electron-builder `beforeBuild` hook output migrated from CommonJS `.js` to ESM `.mjs`
- c420ui bootstrap generator migrated from CommonJS `.cjs` to ESM `.mjs`
- generated c420ui bootstrap artifacts migrated from CommonJS `.cjs` to ESM `.mjs`
- TypeScript configs migrated from CommonJS/node resolution to `NodeNext`

## Dev11 maintained-source hard rules

Dev11 forbids indirect CommonJS compatibility in maintained TypeScript:
- `createRequire()`
- `__filename`
- `__dirname`
- `require.resolve()`
- `node:module` `createRequire` bridges

## Target

- package.json uses `"type": "module"` or isolated ESM package boundaries
- TypeScript uses `NodeNext` or equivalent ESM-compatible config
- build outputs use `.mjs` or ESM `.js` under a module package boundary
- c420ui bootstrap emits `.mjs`
- old `.cjs` bootstrap artifacts are removed, not preserved as permanent fallback
- repository checks reject new CommonJS source patterns

## Remaining migration blocks

- Electron runtime output migration
- `package.json` `main` still points to `.build/electron/main/index.js`
- package-level ESM boundary (`"type": "module"`) still pending
