# Canva Linux Architecture

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
See [c420ui Builder Alias Policy](../c420ui/BUILDER_ALIAS.md).

Canva Linux is the dependent project in this repository; c420ui is the engine
that supplies reusable terminal, action, dependency, root, and artifact behavior.

Canva Linux is the dependent desktop-wrapper project that consumes c420ui as its
generic terminal and action engine. Canva Linux owns product behavior and
project data; c420ui owns reusable orchestration.

## Runtime CLI ownership

The compiled `canva-linux` Electron runtime owns app flags such as `--help`, `--version`, `--debug=1`, `--debug=2`, `--credential-store=...`, and display/GPU runtime controls. `canva-linux-c420ui-builder` remains the c420ui installer/development launcher and must not implement app runtime debug flags.

Runtime diagnostics are exposed through the compiled Canva Linux CLI only. Runtime settings are parsed from explicit CLI flags. GPU diagnostics must preserve the selected runtime CLI GPU/display values (`gpuBackend`, `forceX11`, `forceWayland`, `disableWaylandColorManager`, and `displayOverride`) in logs so support and RC checks can prove active behavior.

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
- `canva-linux-c420ui-builder`
- `scripts/c420ui-adapter/`
- `scripts/canva-linux/`
- `config/canva-linux/`
- `data/io.github.coletivo420.canva-linux.metainfo.xml`
- `io.github.coletivo420.canva-linux.yml`

## Consumed c420ui modules

Canva Linux consumes c420ui through `scripts/c420ui-adapter/bridge.ts`,
`scripts/c420ui-adapter/run.ts`, and the direct CLI bridge. The adapter loads
project data from `config/canva-linux/` and passes it to c420ui contracts.

The `canva-linux-c420ui-builder` launcher contains a Stage 0 bootstrap only to make c420ui executable from a clean source checkout. That bootstrap selects the generated `bootstrap/c420ui` bundle, does not run npm installation or local builds, and hands full dependency validation and repair to c420ui after startup.

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
- Do not alter OAuth, runtime CLI diagnostics, AppImage/Flatpak behavior, artifact names,
  or architecture naming.

## Stage 0 c420ui bootstrap

`canva-linux-c420ui-builder` now treats `bootstrap/c420ui/run-c420ui.cjs` as the primary interactive c420ui entrypoint and `bootstrap/c420ui/run-c420ui-cli.cjs` as the primary direct-action entrypoint. The `.build/scripts` files remain development fallbacks only when the generated bootstrap artifacts are absent.

A release checkout must start c420ui from the bootstrap bundle without `node_modules`, local `esbuild`, or a prior npm install. The bundle may include the c420ui engine and the minimum Canva Linux adapter code that reads `config/canva-linux`, but it must not embed the full dependent-project dependency policy. c420ui takes over dependency validation and repair after startup.


## Bootstrap identity

The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate.
`c420uiVersion` comes from `packages/c420ui/package.json`; `dependentProjectVersion` comes from the repository root
`package.json`. Do not collapse them into a single ambiguous `version` field.

## Dependency repair inside the UI

The Canva Linux interactive launcher starts `bootstrap/c420ui/run-c420ui.cjs` first. Dependency validation and repair for
Canva Linux are wired through the c420ui startup task in `scripts/c420ui-adapter/run.ts`, so a clean checkout can open the
UI before any dependent-project npm repair is attempted.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.
