# AI Maintenance Notes

This document keeps only current maintenance expectations for Canva Linux.

## Current project identity

- Repository: `coletivo420/canva-linux`
- App ID: `io.github.coletivo420.canva-linux`
- Website: `https://coletivo420.github.io/canva-linux/`
- Status: alpha

## Current runtime architecture

- Electron main/preload source lives in `electron/`.
- Runtime output is generated in `.build/`.
- `package.json#main` points to `.build/electron/main/index.js`.
- `electron/preload/canva.bundle.js` is generated and must not be edited manually.
- CL-EyeDropper is the current custom EyeDropper implementation.

## Maintenance rules

- Prefer small, reviewable patches.
- Update docs when behavior changes.
- Update `CHANGELOG.md` for user-facing or architecture changes.
- Do not commit generated `.build/`, `dist/`, `build-dir/`, `.flatpak-builder/` or `repo/`.
- Keep validation source-first: lint, typecheck, tests, docs, then runtime build.

## Logging

- Keep `CANVA_DEBUG=1` and `CANVA_DEBUG=2` as public debug modes.
- Logging must not throw.
- Do not use unsafe raw `JSON.stringify(args)` on arbitrary log arguments.

## Flatpak

- Keep `io.github.coletivo420.canva-linux` as active AppID.
- Keep Flatpak workflows in `./canva-linux.sh`.
- `flatpak-builder` must run as the current user, not through `sudo`.
- System install may request administrator authorization for system Flatpak operations.

## TypeScript

- Keep incremental TypeScript migration.
- Preserve CommonJS runtime compatibility until the project intentionally changes module format.
- Do not bypass `npm run typecheck` or `npm run typecheck:strict`.

## Documentation

- README is the public entry point.
- `docs/VALIDATION.md` describes current validation only.
- Historical phase details belong in `CHANGELOG.md`, not in active maintenance docs.
