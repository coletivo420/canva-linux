# Dev11 ESM Migration

Status: Finalized.

Dev11 finalized the TypeScript/ESM migration. All maintained implementation code is TypeScript, and all generated execution artifacts are ESM .mjs.

Dev11 is complete. New work must not reopen the ESM/TypeScript migration unless
fixing a regression.

Final architecture:

- Canva Linux runtime remains ESM/TypeScript.
- Electron main and Canva page preload remain ESM.
- Toolbar is main-driven and must not reintroduce `toolbar.bundle.mjs`.
- c420ui tooling is TypeScript-first with generated ESM `.mjs` artifacts.
- CLeyedropper remains protected by contracts.
- Shell-to-Rust migration belongs to Dev12.

## Final Dev11 ESM-only contract

- Electron runtime is explicit ESM at `.build/electron/main/index.mjs`.
- The Canva page preload bundle is explicit ESM at `.build/electron/preload/canva.bundle.mjs`; the toolbar is main-driven and has no preload bundle.
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
- Runtime builds require the Canva page preload `.mjs` bundle; the toolbar is
  main-driven and has no preload bundle.
- Repository policy blocks CommonJS patterns across maintained `build-resources/**/*.ts`.
