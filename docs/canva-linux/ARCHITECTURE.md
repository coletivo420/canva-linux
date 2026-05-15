# Canva Linux Architecture

Canva Linux is the dependent project in this repository; c420ui is the engine
that supplies reusable terminal, action, dependency, root, and artifact behavior.

Canva Linux is the dependent desktop-wrapper project that consumes c420ui as its
generic terminal and action engine. Canva Linux owns product behavior and
project data; c420ui owns reusable orchestration.

## Controls

- Electron runtime: main, preload, UI asset, browser, OAuth, tab, upload, and CL-EyeDropper
  runtime behavior.
- Canva Linux project metadata and desktop identity.
- Project action registry, detection provider, dependency declarations,
  development tasks, and artifact recipes.
- Native, Flatpak, AppImage, tarball, checksum, and release documentation.

## Must not control

- Generic c420ui Action Engine policy.
- Generic Command Runner behavior.
- Generic Root Provider behavior.
- Generic host dependency policy.
- Generic artifact recipe validation.

## Implementing files

- `electron/`
- `canva-linux.sh`
- `scripts/c420ui-adapter/`
- `scripts/canva-linux/`
- `config/canva-linux/`
- `data/io.github.coletivo420.canva-linux.metainfo.xml`
- `io.github.coletivo420.canva-linux.yml`

## Consumed c420ui modules

Canva Linux consumes c420ui through `scripts/c420ui-adapter/bridge.ts`,
`scripts/c420ui-adapter/run.ts`, and the direct CLI bridge. The adapter loads
project data from `config/canva-linux/` and passes it to c420ui contracts.

The `canva-linux.sh` launcher contains a Stage 0 bootstrap only to make c420ui executable from a clean source checkout. That bootstrap selects the generated `bootstrap/c420ui` bundle, does not run npm installation or local builds, and hands full dependency validation and repair to c420ui after startup.

## Boundary checks

- `npm run check:canva-linux`
- `npm run check:c420ui-core`
- `npm run check:shared-tooling`
- `npm test`

## Forbidden regressions

- Do not put project-specific strings into `packages/c420ui/src`.
- Do not duplicate c420ui Action Engine policy in the Canva Linux adapter.
- Do not alter runtime Electron behavior as part of documentation or release
  metadata work.
- Do not alter OAuth, `CANVA_DEBUG`, AppImage/Flatpak behavior, artifact names,
  or architecture naming.

## Stage 0 c420ui bootstrap

`canva-linux.sh` now treats `bootstrap/c420ui/run-c420ui.cjs` as the primary interactive c420ui entrypoint and `bootstrap/c420ui/run-c420ui-cli.cjs` as the primary direct-action entrypoint. The `.build/scripts` files remain development fallbacks only when the generated bootstrap artifacts are absent.

A release checkout must start c420ui from the bootstrap bundle without `node_modules`, local `esbuild`, or a prior npm install. The bundle may include the c420ui engine and the minimum Canva Linux adapter code that reads `config/canva-linux`, but it must not embed the full dependent-project dependency policy. c420ui takes over dependency validation and repair after startup.
