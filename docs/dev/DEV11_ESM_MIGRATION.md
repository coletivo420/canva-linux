# Dev11 ESM Migration Plan (FINALIZED)

Dev11 finalized the TypeScript/ESM migration. All maintained implementation code is TypeScript, and all generated execution artifacts are ESM .mjs.

## Final Dev11 ESM-only contract

- Electron runtime is explicit ESM at `.build/electron/main/index.mjs`.
- Electron preload bundles are explicit ESM at `.build/electron/preload/canva.bundle.mjs` and `.build/electron/preload/toolbar.bundle.mjs`.
- Tooling and checks emit `.mjs` outputs.
- c420ui bootstrap generated artifacts are `.mjs`.
- Maintained TypeScript source uses ESM imports/exports only.
- Versioned `.cjs` artifacts are forbidden outside external dependencies.

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

- package.json uses `"type": "module"` and points `main` at `.build/electron/main/index.mjs`
- TypeScript uses `NodeNext` or equivalent ESM-compatible config
- build outputs use `.mjs`
- c420ui bootstrap emits `.mjs`
- old `.cjs` bootstrap artifacts are removed, not preserved as permanent fallback
- repository checks reject new CommonJS source patterns

## Dev11 final ESM boundaries

Dev11 closes the radical ESM migration.

- All maintained runtime/tooling/check/build source is TypeScript.
- All generated Node/tooling outputs are ESM `.mjs`.
- Electron runtime starts from `.build/electron/main/index.mjs`.
- Electron preload bundles are `.mjs`.
- c420ui bootstrap generated artifacts are `.mjs`.
- Versioned `.cjs` files are forbidden.
- CommonJS bridges are forbidden in maintained TypeScript.
- Shell remains only as POSIX/bootstrap boundary.

The only remaining shell files are documented runtime/bootstrap boundaries:

- `canva-linux-c420ui-builder`: stage-0 c420ui bootstrap launcher.
- `run.sh`: Flatpak/POSIX runtime launcher.

They are not migration debt. Any additional shell file is a regression unless explicitly documented as an external runtime boundary.

## Dev11 cleanup closure

- Node test outputs are explicit `.mjs` files under `.build/build-resources/tests/` and `.build/build-resources/c420ui/test/`.
- Root `scripts/` is retired as a source/test/runtime fallback path.
- Preload bundling resolves only TypeScript preload entrypoints and rejects maintained JavaScript preload fallbacks.
- Runtime builds require both Canva and toolbar preload `.mjs` bundles.
- Repository policy blocks CommonJS patterns across maintained `build-resources/**/*.ts`.
