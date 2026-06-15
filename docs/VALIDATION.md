# Validation Checklist (0.1.4-15.Dev.12)

## Dev11 ESM-only validation policy (FINALIZED)

Dev11 finalized the TypeScript/ESM migration.
Maintained TypeScript source must use ESM imports/exports.
CommonJS patterns are forbidden in maintained source:
- `require()`
- `module.exports`
- `exports.*`
- `__dirname` without an ESM helper
- `__filename` without an ESM helper
- `createRequire()`
- `require.resolve()`
- `node:module` `createRequire` bridges

CommonJS may exist only inside external dependencies under `node_modules/`.
Generated bootstrap artifacts are ESM `.mjs` and CommonJS bootstrap artifacts are forbidden.
Electron runtime must start from `.build/electron/main/index.mjs`.
The Canva page preload bundle must be `.build/electron/preload/canva.bundle.mjs`.
The toolbar is main-driven and must not emit `toolbar.bundle.mjs`.
Node tooling, core checks, c420ui checks, and c420ui terminal generated outputs
must use ESM `.mjs` artifacts.
The electron-builder `beforeBuild` hook output must use ESM `.mjs`.
The c420ui bootstrap generator must emit and run `build-bootstrap.mjs`.

## Stabilized toolbar and CLeyedropper validation

The toolbar and CLeyedropper are guarded as stabilized runtime surfaces.
The toolbar is intentionally main-driven. It does not depend on an Electron
preload bridge. The main process applies toolbar state through
`__canvaToolbarApplyState`, and toolbar actions are sent through the
`canva-toolbar://` action channel intercepted by the shell before navigation.
Do not reintroduce `window.canvaTabs`, `toolbar.bundle.mjs`, `toolbar-action`
IPC, or toolbar preload dependencies. `loadElectronPreloadApi` must keep the
sandbox Electron preload resolver for the Canva preload. The CLeyedropper must
keep the scaling patch, snapshot-backed canvas flow, cleanup behavior, abort
handling, and `sRGBHex`-compatible result contract.

Focused gates:

- `npm run build:runtime`
- `npm test -- build-resources/tests/preload-bundle.test.ts`
- `npm test -- build-resources/tests/toolbar-ui.test.ts`
- `npm test -- build-resources/tests/tab-helpers.test.ts`
- `npm test -- build-resources/tests/cl-eyedropper-contracts.test.ts`
- `npm run test:wiring`
- `npm run typecheck`
- `npm run check:canva-linux`

Manual runtime validation remains outside normal repository checks:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
```

Confirm logs include `toolbar-loaded`, `state-broadcast-toolbar`,
`[canva:eyedropper:check]`, `eyedropper:flow open-request`,
`eyedropper:flow snapshot-ready`, and `eyedropper:library picked`.

Dev11 finalizes the ESM/TypeScript migration. Further changes to toolbar
architecture, c420ui host-operation execution, or shell replacement belong to
Dev12 or later.

## Dev12 Rust c420ui migration validation preview

Dev12 introduces Rust only as the c420ui host-operation execution layer.

Canva Linux remains ESM/TypeScript for:

- Electron main process
- Electron preload
- toolbar
- tabs
- CLeyedropper integration
- Canva Linux adapter
- build metadata policy
- packaging policy
- Flatpak/AppImage/native integration policy
- project-specific validation

Rust validation starts with:

- `cargo fmt --manifest-path build-resources/c420ui-rs/Cargo.toml --check`
- `cargo clippy --manifest-path build-resources/c420ui-rs/Cargo.toml -- -D warnings`
- `cargo test --manifest-path build-resources/c420ui-rs/Cargo.toml`
- `npm run check:c420ui-rs-boundary`
- `npm run check:c420ui-rs`
- `npm run check:dev12-rust`

These checks are Dev12 Rust scaffold checks and are not yet part of the global validation chain until the Rust toolchain requirement is confirmed.

Dependent projects now declare host dependencies through their adapter/config.
c420ui resolves those dependencies and routes generic host probes through
`c420ui-host`. Canva Linux only declares what it needs; it does not resolve host
dependencies directly.

Dev12 also routes generic c420ui host process execution through
`c420ui-host run-process --json-lines`. TypeScript remains responsible for UI,
workflow policy, dependency policy and dependent-project boundaries.

- TypeScript wrapper tests
- JSON contract tests between TypeScript and Rust

## c420ui Version Hash Validation

c420ui now displays its own package version with `c420uiSourceHash`.
The c420ui package version is read from
`build-resources/c420ui/package.json` and must not be confused with the
Canva Linux release version.

When rendering c420ui status/version, use
`build-resources/c420ui/package.json.version` plus `c420uiSourceHash`. Do not
substitute Canva Linux `version`, `canvaLinuxSourceHash`, or
`combinedSourceHash`. This applies to the c420ui header, builder
help/version output, session logs, and startup logs.

Focused validation:

- `npm test -- build-resources/c420ui/test/c420ui-version-hash.test.ts`
- `npm run test:c420ui`
- `npm run check:c420ui-bootstrap`

## Source language policy validation

Dev11 validation must prove:

- no maintained JavaScript source was added;
- generated JavaScript remains under generated-output paths;
- generated c420ui `.mjs` artifacts remain validated;
- shell scripts do not contain new JavaScript heredoc policy blocks;
- shell wrappers stay thin unless explicitly documented as host-operation boundaries.

Gates expected after this commit:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm test`
- `npm run check:scripts-core`
- `npm run check:shared-tooling`
- `npm run check:c420ui-bootstrap`
- `npm run check:c420ui-bootstrap-artifacts`

## Committed vs Effective Build Metadata

- `build-resources/canva-linux/config/build-metadata.json` is committed, deterministic metadata and must keep `buildRevision: "unknown"`.
- `.build/canva-linux/build-metadata.effective.json` is ephemeral metadata used by runtime/release flows and may contain Git-derived revision values.
- Repository validation checks must validate committed metadata only.
- Runtime/release/artifact builds must prefer effective metadata and use committed metadata as fallback.
- `build-resources/` remains the canonical layout for c420ui, electron, and Canva Linux assets; legacy root `packages/`,
  `electron/`, and `data/` paths must remain absent.

## Dev.9 metadata persistence and c420ui repair

Dev.9 now requires compiled/package outputs to leave effective build metadata behind. Native installs place
build-resources/canva-linux/config/build-metadata.json in the install prefix, while AppImage and Flatpak bundle artifacts write
<artifact>.build-metadata.json sidecars. Artifact filenames may keep the base package version; hash-visible display
comes from metadata.
Committed metadata in `build-resources/canva-linux/config/build-metadata.json` must remain stable with `buildRevision: "unknown"`.
Effective metadata for builds is generated in `.build/canva-linux/build-metadata.effective.json` and may include a Git revision.
Repository checks validate committed metadata; release/artifact workflows validate and consume effective metadata.

Dev.9 generated artifact detection is now registry-driven from `build-resources/canva-linux/config/artifacts.json` and must not be
limited to AppImage. Generated artifact detection must list all declared registry workflows, including planned workflows
without `outputPattern` as not detected. Produced package outputs should leave effective build metadata via installed
markers or sidecars, and c420ui must prefer that metadata when displaying artifact versions.

Dev.9 corrects structural ownership: c420ui runtime/build/check/test ownership now lives under `build-resources/c420ui`.
The adapter layer in `build-resources/canva-linux/c420ui-adapter` is reserved for Canva Linux integration glue only and must not own
bootstrap validation or runtime tooling. Detection providers must avoid repeated `package.json` parsing and repeated
`npm` process spawning during UI refresh cycles.
c420ui-owned scripts, checks, bootstrap artifacts and tests live under `build-resources/c420ui`. The root `scripts/`
directory is not a maintained compatibility layer. Canva Linux contracts may
delegate to c420ui checks but must not embed c420ui bootstrap implementation
details.
- c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under `build-resources/c420ui`.
- Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by `build-resources/c420ui/checks`.
- No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.
- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under `build-resources/canva-linux/checks`, root `scripts/`,
  root `build-resources/tests/`, `build-resources/canva-linux/c420ui-adapter`, or `packages/`.
- When c420ui bootstrap entrypoints import Canva Linux adapter modules that
  transitively import `scripts/canva-linux` registries, Canva Linux source hash
  must exclude c420ui-owned roots except via the combined hash.

All TypeScript modules consumed by c420ui for project integration, overview detection, artifact fragments, and build metadata
resolution must live under `build-resources/canva-linux/c420ui-adapter`; bootstrap helpers must live under `build-resources/c420ui/bootstrap`.
Do not add new c420ui integration modules
under `scripts/canva-linux`. `npm run check:canva-linux` enforces that c420ui integration modules do not return to
`scripts/canva-linux` and that c420ui-owned tooling stays under `build-resources/c420ui`.
Project registry/config modules may still live under `scripts/canva-linux`; any such module that is bundled into the
c420ui bootstrap must be covered by the c420ui bootstrap source-hash input list. Build metadata formatting must use
`build-resources/electron/main/build-metadata` as the single source of truth; c420ui adapter loaders must not duplicate
`createBuildMetadata` or `normalizeLoadedBuildMetadata` logic.

The c420ui input dialog must close via textbox cancel using setImmediate, keeping overlay Escape as fallback and avoiding redundant textbox Escape handlers.

- Native User: detected v0.1.4-15.Dev.12+g...
- AppImage: detected v0.1.4-15.Dev.12+g...
- Flatpak System/User continuam exibindo +gHASH.

Verify metadata installation:
```bash
# Native Install
./canva-linux-c420ui-builder --install-native --dry-run
# AppImage
./canva-linux-c420ui-builder --bundle-appimage --dry-run
# Flatpak Bundle
./canva-linux-c420ui-builder --bundle-flatpak --dry-run
```

Check metadata files:
- `$HOME/.local/opt/canva-linux/config/canva-linux/build-metadata.json` (Native User)
- `dist/*.AppImage.build-metadata.json` (AppImage)
- `dist/*.flatpak.build-metadata.json` (Flatpak Bundle)

Manual generated artifact validation:

```bash
# Using the builder
./canva-linux-c420ui-builder --bundle-appimage
./canva-linux-c420ui-builder --bundle-flatpak
```

Check that c420ui renders generated artifacts from the registry, preferring effective metadata versions:

```text
Generated Artifacts
  Flatpak bundle: detected v0.1.4-15.Dev.12+g...
  AppImage:       detected v0.1.4-15.Dev.12+g...
```

## Dev.8 pinned home tab-strip guardrail

## c420ui bootstrap artifact validation

The c420ui builder now auto-generates missing or stale bootstrap bundles before
launch. Normal users only need npm installed and do not need to run
`npm run build:c420ui-bootstrap` manually.
Validation gates remain check-only and still fail when committed bootstrap artifacts are stale.
Runtime/builder auto-fixes missing or stale bundles automatically; CI checks detect drift.

build-resources/c420ui/bootstrap/generated/*.mjs are generated artifacts. Do not edit them manually.
Any behavioral change must be made in TypeScript sources and then propagated through npm run build:c420ui-bootstrap.
Rebuild from TypeScript sources and validate with `node --check` plus the c420ui artifact gates.

Dev.8 hotfix: c420ui bootstrap artifacts now have an explicit artifact gate that validates node --check,
known structural corruption patterns, generated-vs-recipe equality, and manifest/build-metadata consistency.
build-resources/c420ui/bootstrap/generated/*.mjs are generated artifacts and must never be edited manually. The bootstrap build now cleans the
output directory before emitting artifacts, records artifact hashes in manifest.json, and validation runs node --check
on every committed bootstrap entrypoint.
Regex-based bundle integrity checks are secondary. Syntax validation and artifact hash verification are mandatory gates.
Dev.8 adds an explicit c420ui node --check gate and a strict artifact gate.
`check:c420ui-bootstrap-artifacts` is a verification gate, not a regeneration command: it must not run
`npm run build:metadata` or `npm run build:c420ui-bootstrap` against the worktree before validating artifacts.
It generates expected c420ui bootstrap artifacts in a temporary directory, compares them byte-for-byte with
committed artifacts, fails when committed artifacts are stale, and requires `git diff --exit-code` to pass after the gate.
Committed c420ui bootstrap artifacts validate against committed build metadata in
`build-resources/canva-linux/config/build-metadata.json`. Source checkout runtime/build metadata may still resolve from Git HEAD when
applicable, but the artifact gate must not rewrite tracked metadata to the current HEAD while validating. This avoids
dirtying the worktree with a not-yet-materialized commit hash.
To regenerate committed artifacts intentionally, run `npm run build:metadata`, `npm run build:scripts`, and
`npm run build:c420ui-bootstrap`, then rerun the artifact gate.

The c420ui bootstrap check must fail if run-c420ui.mjs has syntax errors, stale generated output,
malformed SIGCONT blocks, or host-dependency validators interleaved into the interactive action runner. Validate this with:

- `node --check build-resources/c420ui/bootstrap/generated/run-c420ui.mjs`
- `node --check build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs`
- `node --check build-resources/c420ui/bootstrap/generated/c420ui-builder.mjs`
- `npm run check:c420ui-node-check`
- `npm run check:c420ui-bootstrap`
- `npm run check:c420ui-bootstrap-artifacts`
- `npm run test -- build-resources/c420ui/test/bootstrap-artifacts.test.ts`

Bootstrap PR logs must include these exact success lines after regenerating bootstrap artifacts:

```text
[ok] node --check build-resources/c420ui/bootstrap/generated/run-c420ui.mjs
[ok] node --check build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs
[ok] node --check build-resources/c420ui/bootstrap/generated/c420ui-builder.mjs
[ok] npm run check:c420ui-bootstrap-artifacts
```


- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model, but it must be rendered
  by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar. Do not change BrowserWindow title logic,
  native title handling, OAuth, credential storage, GPU diagnostics, or c420ui metadata/bootstrap logic for this feature.
- Do not render the home tab twice: regular tab state must exclude home, the pinned home control is the only visible
  home-return control, and it must send `go-home`.


`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](c420ui/BUILDER_ALIAS.md).

Current target:

- Version: `0.1.4-15.Dev.12 (Alpha)`
- Release: `v0.1.4-15.Dev.12`
- Versioning rule: `N.N.N-X` with optional `.Dev.N` development phase suffixes

## Detected Installations version visibility

The c420ui `Detected Installations` panel must prefer detected effective/hashed
version fields (`*FullVersion`) when they are available. Legacy marker-only
installs may render their base detected version, but current package outputs
must carry build metadata.

## c420ui logs

The broken Plain Logs mode was removed from c420ui. The normal logs panel remains the supported log view, and F5 Copy Logs remains available when supported.

## Release metadata checks

The validation baseline protects these release facts:

- `package.json` version is `0.1.4-15.Dev.12`.
- `package-lock.json` top-level version is `0.1.4-15.Dev.12`.
- `package-lock.json` root package version is `0.1.4-15.Dev.12`.
- `build-resources/canva-linux/assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml` contains release `0.1.4-14`.
- Active release docs point to `v0.1.4-15.Dev.12`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`.

## Validation tiers

Validation is layered so fast behavioral checks stay close to the code while handoff-only work remains explicit. Dev.6 closes the
post-migration cleanup phase by combining dead-code audit evidence, obsolete validation-contract cleanup, streamlined smoke tests,
runtime CLI diagnostics cleanup, and GPU/display `runtime-options` logging:

1. **Fast unit tests**
   - Cover parsers, the runtime CLI, `normalizeBuilderArgs`, credential-store selection, and small behavior-focused helpers.
2. **Lightweight contract checks**
   - Protect current entrypoints, package identity, App ID, runtime executable name, bootstrap manifest entrypoints, and `sourceHash` freshness.
3. **Minimal smoke tests**
   - Exercise `./canva-linux-c420ui-builder --help`, one planned action such as `--prepare-aur --dry-run`,
     one runtime-flag rejection such as `--canva-debug=1`, and runtime `canva-linux --help`.
4. **RC/manual validation**
   - Covers Flatpak, AppImage, credential persistence, OAuth, GPU/display behavior, complete packaging, and release-artifact handoff.

Historical migration checks should be simplified after stabilization. Active behavior boundaries, such as valued runtime
options requiring `--option=value`, must remain covered by contracts and behavioral tests. GPU/display RC validation must
inspect the central log for `gpu:runtime runtime-options`; selected runtime CLI options are active diagnostics and must not
be reduced to source-only logging.

Do not use `--debug`. It is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
Use `--canva-debug=1` or `--canva-debug=2`.

## Validation domains

- `npm run check:c420ui-core`
  - runs `check-c420ui-core-contracts.ts` as the consolidated c420ui core contract check
  - covers package and dependent-project boundaries, package policy, public API exports, bridge, detection,
    Action Engine, CLI, root provider, command runner, operational logs, artifact workflow runner, and
    interactive action runner contracts
- `npm run check:canva-linux`
  - runs `check-canva-linux-contracts.ts` as the consolidated Canva Linux contract check
  - covers the adapter, root provider, c420ui sudo helper, public branding, project boundary, action registry
    validation, artifact recipes, AppImage, Flatpak, release artifacts, builder command/session logs, and interactive log
    UI integration
- `npm run check:shared-tooling`
  - builds the runtime and shared script checks
  - runs AI guardrails, documentation links, dependency policy, runtime-build verification, and repository policy
    checks for repository-wide tooling coverage

Current direct CLI validation uses:

- `./canva-linux-c420ui-builder <flag>`
- `npm run c420ui:cli -- <flag>`

The consolidated domain runners are self-contained. New validation should extend the appropriate domain runner.
Do not create one-off check files or validation directories for domain-specific coverage.
Introduce shared helpers only when the policy applies across domains.

## OAuth login completion manual validation

Run the Flatpak runtime with Canva debug logging enabled:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

Complete Google login in the OAuth popup. The central log must show the authorized callback finalization sequence without cookie or token values:

```text
popup-canva-callback-detected type=authorized
oauth-authorized-callback-ready
# On slow callback loads before fallback finalization:
# oauth-authorized-callback-fallback-deferred reason=still-loading attempt=...
oauth-finalize-authorized-callback-start
session flush done
oauth-post-flush-settle
oauth-cookie-summary url=https://www.canva.com count=...
close-popup reason=authorized-callback-loaded
reload-source-tab-after-oauth tab=...
did-finish-load https://www.canva.com/...
```

Confirm the reloaded main Canva tab is the OAuth source tab, uses the shared flushed session, and enters authenticated state.
OAuth finalization must be based on the authorized callback type rather than exact callback URL string equality. If Electron
reports an authorized callback during navigation but no matching `did-finish-load` closes the loop, the log should show
`oauth-authorized-callback-fallback-scheduled` and `oauth-authorized-callback-fallback-fired`. On slow callback loads, the
fallback must distinguish the slow load from a missing `did-finish-load` by logging
`oauth-authorized-callback-fallback-deferred reason=still-loading` while the callback WebContents remains loading, and may
only force completion after the bounded max-attempt safety limit. If the source webContents id cannot be resolved, the
fallback to the active tab must be logged with `fallback=true`.

## GPU/display runtime diagnostics manual validation

Run Canva Linux with GPU/display runtime flags and inspect the central log for `gpu:runtime runtime-options`. The expected
line shape is:

```text
gpu:runtime runtime-options source=runtime-cli
gpuBackend=<value> displayOverride=<auto|x11|wayland> forceX11=<bool> forceWayland=<bool> disableWaylandColorManager=<bool>
```

Minimum manual examples:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
flatpak run io.github.coletivo420.canva-linux \
  --canva-debug=2 \
  --gpu-backend=software \
  --force-wayland \
  --disable-wayland-color-manager
electron . --gpu-backend=software
electron . --force-wayland
electron . --disable-wayland-color-manager
```

When the software backend is combined with Wayland forcing and Wayland color-manager disabling, the central log must include:

```text
gpu:runtime runtime-options source=runtime-cli gpuBackend=software displayOverride=wayland forceX11=false forceWayland=true disableWaylandColorManager=true
```

## Required automated validation

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run check:shared-tooling`
- `npm run check:scripts-core`
- `npm run validate`
- `npm run docs:check-links`
- `npm run docs:check-ai`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm test`
- `npm run validate:project`

## Release grep review

Before release handoff, inspect the requested release grep set from the release task.
Only clearly historical changelog material may retain previous release identifiers.
Old AppStream history may retain old development release identifiers.
Generated dependency source manifests may retain platform package names that contain `x64`.

## Manual validation summary

- Confirm `./canva-linux-c420ui-builder --help` exposes the current builder surface.
- Confirm `./canva-linux-c420ui-builder --prepare-aur --dry-run` exercises one planned-action dry-run without expanding builder smoke coverage.
- Confirm `./canva-linux-c420ui-builder --canva-debug=1` is rejected because runtime flags belong to the compiled runtime app.
- Confirm runtime `electron . --help` and `electron . --canva-debug=1` remain runtime-owned.
- Confirm `flatpak run io.github.coletivo420.canva-linux --debug=1` fails with the reserved Electron/Node flag message before the runtime starts.
- Confirm `Release: v0.1.4-15.Dev.12` appears in current release docs.
- Confirm AppImage, Flatpak, tarball and checksum release docs preserve real generated file names.
- Confirm root authentication prompts only for privileged actions.
- Confirm Secret Service-backed persistent login and ephemeral session policy remain documented.
- Confirm the GPU/display central-log line matches the runtime diagnostics validation section above.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.

## Effective build metadata validation

Validation checks that source versions remain clean and generated effective versions append `+g<short-hash>` when a build
revision is known. Build revisions must come from deterministic commit metadata rather than random values, timestamps, or
counters.

OAuth validation also checks that the first post-OAuth reload targets the current source tab URL and that
`https://www.canva.com/` appears only as the fallback navigation after localized public logged-out landing detection.
## Dev.8 hotfix guardrails

- c420ui must display Canva Linux effective build metadata when `build-resources/canva-linux/config/build-metadata.json`, CI revision
  variables, or a source checkout `.git` HEAD can provide it; source `package.json` and `project-ui.json` stay free of
  committed `+g<hash>` metadata.
- The c420ui brand version remains independent and comes from `build-resources/c420ui/package.json`; c420ui-specific
  `0.1.0+g<hash-do-c420ui>` metadata is future work, not part of this hotfix.
- `build:c420ui-bootstrap` must refresh or resolve effective build metadata before writing the bootstrap manifest, including
  dependent project full version, build revision, display version, and phase.
- MediaDevices diagnostics must preserve native receiver binding for `getUserMedia` and `getDisplayMedia`, including detached
  calls, and must not log token/cookie/code/state values.
- Toolbar favicons must respect the internal CSP by rendering only `data:` and `file:` image URLs, falling back instead of
  rendering remote `https:` favicons.
- OAuth localized public-landing probes must normalize both DOM attributes and localized keywords with NFKD so composed and
  decomposed labels are equivalent.
- c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under build-resources/c420ui.
- Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by build-resources/c420ui/checks.
- No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.
- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or
  generated artifacts under `scripts/checks/canva-linux`, root `scripts/`,
  root `build-resources/tests/`, `scripts/c420ui-adapter`, or `packages/`.
- When c420ui bootstrap entrypoints import Canva Linux adapter modules that
  transitively import scripts/canva-linux registries, the specific imported
  scripts/canva-linux submodules must remain in
  `C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS`.

## Dev11 preload typing

Dev11 keeps preload modules from CommonJS-style TypeScript to typed ESM-style TypeScript.
Preload modules must not use `@ts-nocheck`, `require()`, `module.exports`, or JSDoc typedefs as a substitute for TypeScript types.
- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under `build-resources/canva-linux/checks`, root `scripts/`,
  root `build-resources/tests/`, `build-resources/canva-linux/c420ui-adapter`, or `packages/`.
- When c420ui bootstrap entrypoints import Canva Linux adapter modules that transitively import scripts/canva-linux registries,
  the specific imported scripts/canva-linux submodules must remain in C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS.

Canva Linux and c420ui now use separate deterministic content hashes.
Canva Linux changes update canvaLinuxSourceHash, c420ui changes update
c420uiSourceHash, and combinedSourceHash changes when either side changes.
Git buildRevision remains separate and is only used by effective
metadata/release builds.

## Split source hash validation

Canva Linux and c420ui now use separate deterministic content hashes.
- `canvaLinuxSourceHash` changes only when Canva Linux inputs change.
- `c420uiSourceHash` changes only when c420ui-owned inputs change.
- `combinedSourceHash` changes when either component hash changes.
- `buildRevision` remains separate from source hashes and is used only for effective build/release metadata.
- Docs, tests and generated artifacts must not affect either source hash.

Validation commands:
- `npm run build:metadata`
- `npm run build:metadata:effective`
- `npm test`
- `npm run check:canva-linux`
- `npm run check:c420ui-bootstrap`

Expected results:
- `build-resources/canva-linux/config/build-metadata.json` must contain stable deterministic source hashes.
- `.build/canva-linux/build-metadata.effective.json` may change `buildRevision` and derived version strings, but must preserve the same source hashes.

## Dev11 validation ownership

- Project validation runs from `build-resources/canva-linux/validation/project.ts` via `validate:project`.
- Doctor runs from `build-resources/canva-linux/validation/doctor.ts` via `validate:doctor`.
- Flatpak and Flathub policy checks run from TypeScript entrypoints; shell dispatch wrappers are not allowed outside documented POSIX/bootstrap boundaries.

## Dev11 operational ownership

- Install/uninstall/maintenance/packaging/build/versioning mechanics are routed
  through c420ui-owned TypeScript sources under `build-resources/c420ui/*`.
- Action Registry operational commands target generated ESM `.build/scripts/*.mjs` routes.
- The root `scripts/` path is not an active ownership root in Dev11 final mode.

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

## Dev11 obsolete migration leftovers

- `npm test` emits and runs compiled test files as `.mjs` under `.build/build-resources/tests/` and `.build/build-resources/c420ui/test/`.
- The root `scripts/` path is not a fallback source, test, or runtime compilation area.
- Preload bundling accepts only TypeScript source under `build-resources/electron/preload/*.ts`; maintained `.js` preload source is invalid.
- `build:runtime` must require `.build/electron/preload/canva.bundle.mjs` and must not require `toolbar.bundle.mjs`.
- Repository policy rejects CommonJS bridges in all maintained `build-resources/**/*.ts`.
