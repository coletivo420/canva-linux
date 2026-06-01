# Dev11 ESM Migration Plan

## Current CommonJS debt

- package.json esbuild commands using `--format=cjs`
- tsconfig module/commonjs settings
- generated c420ui bootstrap `.cjs`
- `.build/scripts/*.js` generated as CommonJS
- `.build/electron/**/*.js` generated from CommonJS TypeScript config
- CommonJS assumptions around `__dirname` and `__filename`
- Node execution paths expecting `.js` CommonJS outputs

## Source debt resolved in Dev11

- c420ui terminal `app.ts`/`modal.ts`/`runtime.ts` maintained source CommonJS debt
- Electron shared `debug.ts`/`navigation.ts` duplicate `module.exports`
- `check-runtime-build.ts` CommonJS entry guard in maintained TypeScript source

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
