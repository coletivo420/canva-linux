# TypeScript Conversion Review

This project has completed the Dev11 TypeScript/ESM migration for maintained Node/Electron source.

## Current mode

The app runtime, tooling, c420ui bootstrap, checks and tests are maintained as TypeScript and emitted as explicit ESM `.mjs` artifacts where Node/Electron executes generated code.

TypeScript is enforced through:

- broad `npm run typecheck`;
- strict TypeScript surfaces through `npm run typecheck:strict`;
- explicit Electron runtime output through `npm run build:runtime`;
- bundled script/check/test entrypoints emitted as `.mjs`;
- repository policy checks that reject CommonJS bridges and maintained JavaScript source.

## Dev11 ESM-only contract

- Electron runtime starts at `.build/electron/main/index.mjs`.
- The Canva page preload bundle is `.build/electron/preload/canva.bundle.mjs`; the toolbar is main-driven and has no preload bundle.
- Tooling/check/test outputs are generated `.mjs`.
- c420ui bootstrap generated artifacts are committed `.mjs` files with source and artifact hash validation.
- Versioned `.cjs` files are forbidden outside external dependencies.
- CommonJS bridges such as `createRequire`, `require.resolve`, `__filename` and `__dirname` are forbidden in maintained TypeScript.

## Maintained-source rule

All maintained Node/Electron logic must be TypeScript. A new source file is acceptable only when:

- it uses ESM imports/exports;
- it does not rely on CommonJS bridges or loader patches;
- conversion does not affect Flatpak packaging unexpectedly;
- conversion does not change public behavior;
- behavior is checked against `CHANGELOG.md` and relevant validation gates.

## Non-TypeScript boundaries

Do not convert these POSIX/runtime boundaries to TypeScript:

- `canva-linux-c420ui-builder`: stage-0 bootstrap launcher.
- `run.sh`: Flatpak/POSIX runtime launcher.
- Flatpak manifests and Linux metadata files.
