# AI Guardrails

## Dev11 ESM-only guardrails (FINALIZED)

Dev11 finalized the TypeScript/ESM migration.
- Maintained TypeScript source must use ESM imports/exports.
- CommonJS patterns are forbidden in maintained source: `require()`,
  `module.exports`, `exports.*`, `__dirname` without ESM helper, and
  `__filename` without ESM helper.
- Dev11 also forbids indirect CommonJS bridges in maintained TypeScript:
  `createRequire()`, `require.resolve()`, and `node:module` createRequire
  adapters.
- CommonJS may exist only inside external dependencies under `node_modules/`.
- Generated bootstrap artifacts are ESM `.mjs` and CommonJS bootstrap artifacts are forbidden.
- Electron runtime starts from `.build/electron/main/index.mjs`.
- The Canva page preload bundle is `.build/electron/preload/canva.bundle.mjs`.
  The toolbar is main-driven and must not have a preload bundle.
- Node tooling generated outputs moved to ESM `.mjs` under `.build/scripts/`.
- Core and c420ui checks generated outputs moved to ESM `.mjs`.
- c420ui terminal generated output moved to ESM `.mjs`.
- TypeScript runner bootstrap moved to ESM `.mjs`.
- electron-builder `beforeBuild` hook output moved to ESM `.mjs`.
- c420ui bootstrap generator output moved to ESM `.mjs`.

## Toolbar and CLeyedropper stabilized runtime surfaces

The toolbar and CLeyedropper are guarded as stabilized runtime surfaces.
The toolbar is intentionally main-driven. It does not depend on an Electron
preload bridge. The main process applies toolbar state through
`__canvaToolbarApplyState`, and toolbar actions are sent through the
`canva-toolbar://` action channel intercepted by the shell before navigation.
Do not reintroduce `window.canvaTabs`, `toolbar.bundle.mjs`, `toolbar-action`
IPC, or toolbar preload dependencies. Keep Electron preload API resolution
centralized in `loadElectronPreloadApi`; its sandbox `globalThis.require` /
`eval("require")` fallback is allowed only at the Canva preload boundary.

The CLeyedropper must keep the scaling patch, snapshot-backed canvas flow,
cleanup behavior, abort handling, and `sRGBHex`-compatible result contract. Do
not replace CLeyedropper with a raw EyeDropper call; Canva Linux depends on the
snapshot-backed custom picker. Do not remove `installClEyeDropperScalingPatch`
or `loadElectronPreloadApi` from `custom-eyedropper-flow`.

## Dev11 final architecture

Dev11 is finalized.

Do not reintroduce:

- `toolbar.bundle.mjs`
- `window.canvaTabs`
- `toolbar-action` IPC
- maintained JavaScript wrappers
- CommonJS compatibility
- root `packages/`
- root `electron/`
- root `data/`
- root `test/`
- root `types/`

The toolbar is intentionally main-driven. State is applied by the main process
through `__canvaToolbarApplyState`. Actions use the `canva-toolbar://` action
channel intercepted by `shell.ts` before navigation.

## Dev12 Rust c420ui boundary

Dev12 Rust migration is c420ui-only.
Phase 1-2 keep the TypeScript c420ui terminal UI while operational filesystem
and process work moves to Rust. Phase 3-5 migrate `c420ui-tui` directly after
final contracts are defined. Do not introduce an experimental terminal backend
or a long-lived optional TypeScript/Rust toggle.

Rust may be introduced under:

```text
build-resources/c420ui-rs/
```

The first Rust commit may create build-resources/c420ui-rs/ only.
Do not add Rust code under build-resources/canva-linux or build-resources/electron.
Do not call Rust from Canva Linux runtime.
Do not hardcode Canva Linux identity in Rust.

Rust must not migrate, replace, wrap or own Canva Linux runtime code.

Canva Linux remains ESM/TypeScript for:

- Electron main process
- Electron preload
- toolbar
- tabs
- CLeyedropper integration
- Canva Linux adapter
- build metadata policy
- packaging policy
- project-specific validation
- Flatpak/AppImage/native integration policy

Rust must not contain Canva Linux names, app IDs, package names, Flatpak IDs,
repository URLs, Electron runtime paths, toolbar rules, CLeyedropper rules or
Canva Linux release policy.

Rust should provide generic c420ui host-operation commands with stable JSON
output and stable exit codes.

Dependent projects declare host dependencies in their own config and adapter.
c420ui resolves those declarations generically. Rust may probe Node.js and
commands from JSON input, but it must not hardcode dependent-project dependency
names, app identity, packaging policy, or runtime paths.

Do not hardcode dependent-project dependencies in c420ui core or Rust. Dependent
projects declare dependencies in their own config, and c420ui resolves them
generically.

Dev12 c420ui host process execution goes through `c420ui-host run-process
--json-lines`. Do not reintroduce `child_process.spawn` or `spawnSync` as
maintained c420ui generic process execution. TypeScript remains responsible for
the terminal UI during Phase 1-2, plus workflow policy, dependency policy and
dependent-project boundaries.

Maintenance targets belong to dependent-project config. Do not hardcode cleanup
targets in c420ui TypeScript, do not reintroduce `fs.rmSync` maintenance
deletion, and do not run direct `chown` from TypeScript maintenance operations.
Generic filesystem maintenance belongs to `c420ui-host`.

Install identity, native paths and artifact naming policy belong to the
dependent project config. Do not hardcode those values in Rust. Do not
reintroduce `build-resources/c420ui/host/preflight.ts`, Bash command probes, or
TypeScript filesystem mutation for native install, icon install,
`linux-unpacked` normalization, AppImage cleanup/find, or checksum sidecar
writes. Generic mutable filesystem operations belong to `c420ui-host`.

## c420ui structural ownership and efficiency

- All maintained build, runtime-build, packaging, install, detection, versioning and operation tooling now lives under `build-resources/c420ui`.
- All Canva Linux-specific adapters, assets, validation policies, checks and packaging policies now live under `build-resources/canva-linux`.
- Shell is allowed only for unavoidable POSIX/runtime boundaries or external
  tool contracts. Shell must not own JSON parsing, version detection, packaging
  orchestration, installation logic, artifact metadata, or validation policy.
- Project validation runs from `build-resources/canva-linux/validation/project.ts` via `validate:project`.
- Doctor runs from `build-resources/canva-linux/validation/doctor.ts` via `validate:doctor`.
- Flatpak and Flathub policy checks run from TypeScript entrypoints.
- Install, uninstall, maintenance, packaging, build, artifact and versioning mechanics are c420ui-owned and now live under `build-resources/c420ui/*`.
- c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under `build-resources/c420ui`.
- Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by `build-resources/c420ui/checks`.
- No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.
- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or
  generated artifacts under `build-resources/canva-linux/checks`.
- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under `build-resources/canva-linux/checks`.
- Do not place c420ui-owned generated artifacts under root `scripts/`,
  root `build-resources/tests/`,
  `build-resources/canva-linux/c420ui-adapter`, or `packages/`.
- Canva Linux source hash must exclude c420ui-owned roots except via the combined hash.
- c420ui status/version rendering must use `build-resources/c420ui/package.json.version`
  plus `c420uiSourceHash`. Do not substitute the Canva Linux release version,
  `canvaLinuxSourceHash`, or `combinedSourceHash` for the c420ui block. This
  includes c420ui headers, builder help/version output, session logs, and
  startup logs.

## Dev.9 metadata persistence and c420ui repair

- Dev.9 now requires compiled/package outputs to leave effective build metadata behind. Native installs place
  build-resources/canva-linux/config/build-metadata.json in the install prefix, while AppImage and Flatpak bundle artifacts write
  <artifact>.build-metadata.json sidecars. Artifact filenames may keep the base package version; hash-visible
  display comes from metadata.
- The c420ui input dialog must close via textbox cancel using setImmediate, keeping overlay Escape as fallback and
  avoiding redundant textbox Escape handlers.
- Artifact filenames may keep the base package version; hash-visible display comes from metadata. Reject changes that
  remove metadata installation or sidecar generation.
- AppImage and Flatpak bundle artifacts must generate a `.build-metadata.json` sidecar.
- Native system/user installs must place `build-resources/canva-linux/config/build-metadata.json` into the installation prefix.
- Dev.9 generated artifact detection is now registry-driven from `build-resources/canva-linux/config/artifacts.json` and must not be
  limited to AppImage. Produced package outputs should leave effective build metadata via installed markers or sidecars,
  and c420ui must prefer that metadata when displaying artifact versions.
- Dev.9 keeps c420ui integration modules under `build-resources/canva-linux/c420ui-adapter` while allowing project registry/config modules
  under `scripts/canva-linux`. Any `scripts/canva-linux` module that is still bundled into bootstrap must be covered by
  `C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS`.
- Build metadata formatting must use `build-resources/electron/main/build-metadata` as the single source of truth; c420ui adapter loaders
  must not duplicate `createBuildMetadata` or `normalizeLoadedBuildMetadata` logic.
- Do not write Git HEAD-derived revisions into `build-resources/canva-linux/config/build-metadata.json`; committed metadata must
  keep `buildRevision: "unknown"`.
- Effective metadata belongs under `.build/canva-linux/build-metadata.effective.json` and may include Git revision for runtime/artifact builds.
- Repository checks validate committed metadata only; artifact/release checks validate effective metadata.
- Committed metadata must remain stable and deterministic across incremental builds and build-resources/tests/check runs.
- Repository validation must not depend on live Git revision resolution for committed metadata contracts.
- `build-resources/` is the canonical home for c420ui, electron, and Canva Linux assets; do not restore root `packages/`, `electron/`,
  `data/`, or loose icon assets.

## Dev.8 pinned home tab-strip guardrail

- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model, but it must be rendered
  by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar. Do not change BrowserWindow title logic,
  native title handling, OAuth, credential storage, GPU diagnostics, or c420ui metadata/bootstrap logic for this feature.
- Do not render the home tab twice: regular tab state must exclude home, the pinned home control is the only visible
  home-return control, and it must send `go-home`.


`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](../c420ui/BUILDER_ALIAS.md).

This file is auxiliary maintenance policy for AI agents. It is not public user documentation.



## Validation layering policy

Use validation layers intentionally:

1. **Fast unit tests** cover parsers, runtime CLI behavior, `normalizeBuilderArgs`, credential-store selection, and focused helpers.
2. **Lightweight contract checks** cover current entrypoints, App ID, runtime name, package identity, manifest entrypoints, and bootstrap `sourceHash`.
3. **Minimal smoke tests** cover builder `--help`, one planned action with `--dry-run`, one runtime-flag rejection, and runtime `--help`.
4. **RC/manual validation** covers Flatpak, AppImage, credential persistence, OAuth, GPU/display behavior, and complete packaging.

Historical migration checks should be simplified after stabilization instead of string-hunting old generated names forever.
Active behavior boundaries must remain covered, including valued runtime CLI parsing that requires an explicit `--option=value`
boundary. GPU/display selected runtime CLI options are active diagnostics: RC validation must inspect the central log for
`gpu:runtime runtime-options`, and those diagnostics must not be reduced to source-only logging. The log must include
`gpuBackend`, `displayOverride`, `forceX11`, `forceWayland`, and `disableWaylandColorManager`.

## c420ui bootstrap source-hash guardrail

## c420ui generated-artifact anti-corruption guardrail

The c420ui builder/runtime must auto-generate missing or stale bootstrap bundles before launch.
Normal users only need npm installed and must not be instructed to run `npm run build:c420ui-bootstrap` manually for normal builder startup.
Validation gates remain check-only and must still fail when committed bootstrap artifacts are stale.

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
malformed SIGCONT blocks, or host-dependency validators interleaved into the interactive action runner.


Any change to c420ui startup sources, the Canva Linux adapter, dependent-project configs, Canva Linux action or detection scripts,
c420ui package metadata, the bootstrap hash helper, or the bootstrap builder must regenerate the bootstrap bundle with
`npm run build:c420ui-bootstrap`. Do not manually edit generated bootstrap `.mjs` files. Do not leave
`build-resources/c420ui/bootstrap/generated/manifest.json` with a stale `sourceHash`; run `npm run check:c420ui-bootstrap` before handing off release changes.

## Language and future i18n

- All maintained source code, code comments, UI strings, README, docs, changelog and AI maintenance instructions must be written in English.
- Do not add Portuguese comments, Portuguese docs, Portuguese UI strings, or mixed-language source text to the repository.
- User-facing translations may be introduced later through an explicit i18n architecture.
- Do not hardcode future translations directly in runtime code.
- Future i18n must use structured translation resources, typed keys and fallback language rules.
- Until an i18n system exists, English is the only maintained repository language.
- README is the public entry point; long command references belong in `docs/CLI.md`.
- Active docs must match current version/phase and validation flow.
- Docs must reflect the current phase only; historical details belong in `CHANGELOG.md`.
- REVIEW.md must preserve the Review Checklist.
- File inventories must be appended under a separate section or moved to `docs/internal/REPOSITORY_INVENTORY.md`.
- Never replace process safety checklists with generated inventories.

## Versioning

- Preserve version `0.1.4-15.Dev.9` unless the maintainer explicitly requests a versioning change.
- Do not introduce `0.1.4-dev.14`, `0.1.4-rc.14`, or `0.1.4.14`.
- Preserve the `N.N.N-X` release versioning rule with optional `.Dev.N` development phase suffixes.
- Release identity must use the npm-compatible package version everywhere; do not publish four-number dotted versions.
- Every behavior change must update `CHANGELOG.md`.
- Runtime diagnostics are exposed through the compiled Canva Linux CLI only. Do not reintroduce legacy environment fallback
  inputs for runtime debug or credential-store selection, and do not add app runtime debug flags to `canva-linux-c420ui-builder`.
  Do not use `--debug`; it is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
  Use `--canva-debug=1` or `--canva-debug=2`.



## 0.1.4-14 split documentation policy

- Current maintained release target is `0.1.4-15.Dev.9`.
- OAuth login completion must finalize authorized callbacks by callback type instead of exact URL string equality,
  keep a guarded fallback timer for redirect sequences without a matching `did-finish-load`, defer that fallback while the
  authorized callback WebContents is still loading except after a bounded max-attempt safety limit, flush the shared persistent
  session, run the documented post-flush settle guard, log only safe cookie metadata for `https://www.canva.com`, close the
  popup, and reload the OAuth source tab rather than a generic active tab.
- The release version format must remain `N.N.N-X` with optional `.Dev.N` development phase suffixes.
- Canva Linux is the dependent project; c420ui is the generic engine.
- Canva Linux does not install dependencies directly from builder commands or shell helpers, except for the documented Stage 0
  c420ui bootstrap that starts the generated `build-resources/c420ui/bootstrap/generated` bundle without npm dependencies.
- Canva Linux does not validate generic artifact recipes; c420ui owns that validation.
- The Canva Linux adapter must not duplicate Action Engine policy for planned actions, dry-run,
  confirmation, root policy, `requestRootAccess`, or fallback execution.
- `root scripts/ ownership` is scripts/ must not return.
- Split docs must explain controls, non-controls, implementing files, consumed configs/adapters,
  boundary checks, and forbidden regressions.

## Host dependency policy

- c420ui owns host dependency management for command checks, Node minimum checks, npm checks, install strategy, repair/skip modes, messages and exit codes.
- Dependent projects declare dependency config only; for Canva Linux this is `build-resources/canva-linux/config/dependencies.json`.
- Project builder commands must not run `npm ci`, `npm install`, or dependency repair directly. Stage 0 only starts the generated c420ui bootstrap bundle.
- Project shell helpers must not own npm dependency policy or hardcoded npm dependency lists.
- Builder command bootstrap may only select the generated c420ui bootstrap bundle or the `.build` development fallback.
  Full npm dependency policy remains owned by c420ui.

## Project tree boundaries

- Read `docs/PROJECT_TREE.md` before moving code across Electron, scripts, c420ui, packaging,
  docs, or generated-output boundaries.
- `build-resources/c420ui/src/terminal/` contains the generic c420ui terminal UI.
- Generic c420ui terminal UI belongs under `build-resources/c420ui/src/terminal/`.
- Do not reintroduce `scripts/c420ui/`.
- `scripts/core` is infrastructure-check-only; do not add runtime or product entrypoints there.
- Active docs must not reference removed runtime paths except as explicitly historical changelog or roadmap context.
- Terminal diagnostics must use the generic project bridge/detection contract.
- Do not call `scripts/run-core-entry.sh overview-status` from c420ui terminal UI.
- Dependent project adapters live under `build-resources/canva-linux/c420ui-adapter/`.
- `build-resources/canva-linux/c420ui-adapter/` is project-local adapter-only code, not a public c420ui API.
- Do not create project-specific c420ui adapter directory names; keep the reusable project-local adapter path stable across dependent projects.
- `build-resources/c420ui/` is a planned standalone package boundary, not a published package promise.
- Do not document c420ui as an externally consumable package until the maintainer explicitly requests publication.
- Keep generated output in `.build/`, `dist/`, `coverage/`, or `repo/`; do not treat it as maintained source.


## c420ui separation roadmap

### c420ui terminal startup and root guard

- The c420ui terminal runtime owns the root launch guard.
- Do not add root launch checks to `build-resources/c420ui/scripts/run-c420ui.ts`.
- Do not add root launch checks to `build-resources/canva-linux/c420ui-adapter/run.ts`.
- Project adapters must not expose `rootLaunchGuardMessage`.
- The Canva Linux root provider is only for privileged actions, not for launching the terminal UI.


### c420ui package boundary

- Read `docs/ROADMAP_C420UI_SEPARATION.md` before moving c420ui code toward packages or adapters.
- Separate for compatibility first and external extraction later.
- Do not migrate c420ui to ESM during the current separation phase.
- Do not publish or promise an NPM package during the current separation phase.
- Do not reintroduce `scripts/c420ui/`.
- Do not change visual behavior as part of package-boundary work.
- Do not reintroduce `build-resources/canva-linux/checks/core/action-runner.ts`.
- Do not reintroduce `check:legacy-compat`.
- Do not document Action Runner as an available execution path.
- Do not change versioning as part of c420ui separation.
- Detection framework belongs to `build-resources/c420ui/src/detection.ts`.
- Canva Linux c420ui TypeScript integration modules belong to `build-resources/canva-linux/c420ui-adapter/`. TypeScript modules
  consumed by c420ui for project integration, overview detection, artifact fragments, and build metadata resolution
  must live under `build-resources/canva-linux/c420ui-adapter`; bootstrap recipes and source-hash helpers must live under
  `build-resources/c420ui/bootstrap`. Do not add new c420ui integration modules under `scripts/canva-linux`.
- Project registry/config modules may still live under `scripts/canva-linux`; if they are bundled into c420ui bootstrap,
  they must be covered by `C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS`.
- Generated artifact detection must list all declared registry workflows, including planned workflows without
  `outputPattern` as not detected.
- Do not put product detection logic in `scripts/core`.
- Do not hardcode Canva Linux detection keys inside c420ui core.
- c420ui owns the detection engine; Canva Linux owns the concrete probes.
- c420ui owns generic host dependency contracts but not concrete project dependency lists.
- Canva Linux owns npm bootstrap policy, Node.js version policy, and `CANVA_*` bootstrap variables.
- Project builder commands must use the host dependency provider instead of calling bootstrap shell scripts directly.
- Do not run npm installation directly from project builder commands; c420ui owns host dependency management after the Stage 0 bootstrap.
- Keep project shell out of npm dependency policy; dependent projects declare host dependencies in config.
- Detection status uses `project`, not the removed legacy `package` shape.
- Do not reintroduce `package: project` compatibility in detection providers.
- c420ui detection probes are generic; Canva Linux owns concrete probe keys and shell glue.
- Artifact workflow execution belongs to `build-resources/c420ui/src/workflow-runner.ts`.
- Canva Linux may define workflow recipes, action IDs and output patterns.
- Do not hardcode Canva Linux action IDs inside c420ui workflow runner.
- Do not implement artifact workflow phase logic inside the Canva Linux adapter.
- Artifact workflows must execute concrete actions through the c420ui Action Engine.
- Do not call `adapter.runAction()` directly from project artifact workflow bridges.
- Root/sudo policy must remain centralized in the Root Provider.
- Dry-run and planned artifact workflows must not trigger sudo or concrete command execution.

## c420ui

- The official tool name is `c420ui`, lowercase.
- Do not use `C420UI` as public product branding.
- PascalCase TypeScript aliases may exist only as maintained API aliases; user-facing text must say `c420ui`.
- The c420ui logo must remain the approved three-line lowercase logo unless the maintainer explicitly requests a redesign.
- c420ui is the user-facing name of the terminal interface.
- Do not reintroduce Terminal Assistant as product name.
- Do not use TUI as product name.
- The interactive shell menu has been removed. Do not reintroduce `run_interactive_mode`, `menu_install`, `menu_dev`, `menu_maint`, or tool switching.
- The project exposes only c420ui and direct CLI actions.
- Legacy explicit c420ui routing flags are removed. The builder command opens c420ui when called without args; any argument is resolved as direct CLI.
- Legacy interface-routing environment variables are removed and must not be read for interface routing.
- Shell files are limited to `canva-linux-c420ui-builder` and `run.sh`; shell UI menus are forbidden.
- Application Settings are c420ui state, not shell actions.
- c420ui must keep an explicit FocusZone model.
- Tab and Shift+Tab must move between focusable c420ui blocks.
- The active c420ui block must have a visible border/label highlight.
- The active menu/settings cell must have a visible highlight.
- Settings checkboxes must show enabled/disabled state clearly.
- Modal dialogs must not leak Tab focus back to the main c420ui.
- During running actions, Tab/scroll/log copy may work, but action execution must remain blocked.
- Help must document current keyboard navigation.
- Manual text selection mode must disable mouse capture globally, not only on the logs widget.
- terminalTextSelectionMode must disable mouse capture globally, not only on the logs widget.
- c420ui mouse settings must be restored when leaving text selection mode.
- F5 log copy must work regardless of text selection mode.
- F5 clipboard copy must keep working even when text selection mode is enabled.
- Help must document log copy, manual selection and terminal limitations.
- Help must document terminal text selection limitations.
- Tool-level logs must be visible in the c420ui when general Tool logs are enabled.
- Action logs and Tool logs must remain distinguishable.
- Detection errors must not break the c420ui layout.
- Overview status must use the c420ui detection engine and Canva Linux detection provider.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- c420ui Header and Project Header must remain separate fixed components.
- Side-by-side header layout is preferred on wide terminals.
- Stacked header layout is allowed only as a narrow-terminal fallback.
- Workspace must start below the tallest header row.
- c420ui Header must use only c420ui brand config.
- Project Header must use only project config.
- c420ui core must not hardcode project-specific metadata.
- Project metadata must come from config/adapters.
- Headers must not be part of FocusZone or Tab navigation.
- Do not manually move only the Overview panel; always use shared workspaceTop.
- c420ui brand metadata must be reusable across projects.
- Project header metadata must be injected through configuration.
- Other projects must be able to reuse c420ui without editing the c420ui core.

## Action Registry

- c420ui/CLI actions must be sourced from `build-resources/canva-linux/config/actions.json`.
- Action metadata must come from `build-resources/canva-linux/config/actions.json`.
- Canva Linux project configuration belongs under `build-resources/canva-linux/config/`.
- `build-resources/canva-linux/config/actions.json`, `build-resources/canva-linux/config/development.json`,
  and `build-resources/canva-linux/config/artifacts.json`
  are project-owned declarations.
- Do not put project configuration under `scripts/`.
- Canva Linux action registry loading belongs under `scripts/canva-linux/actions/`.
- Do not reintroduce `build-resources/canva-linux/checks/core/action-registry.ts`.
- Do not reintroduce `build-resources/canva-linux/checks/core/validate-actions.ts`.
- Generic c420ui action validation belongs in `build-resources/c420ui/src/actions.ts`.
- Do not duplicate action logic in c420ui or builder command code.
- Do not ignore `action.env` from `build-resources/canva-linux/config/actions.json`.
- Any `system`/`user` scope action must behave the same in c420ui and direct CLI.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- c420ui and CLI must share the same TypeScript action contract.
- Direct CLI and interactive c420ui actions already route through the c420ui Action Engine.
- Action execution belongs to the c420ui Action Engine.
- Direct CLI execution belongs to the c420ui CLI bridge.
- Command execution belongs to the c420ui Command Runner.
- New action execution policy belongs to the c420ui Action Engine, Root Provider, Command Runner, and operational log policy.

- c420ui owns generic action resolution by id and CLI flag.
- c420ui owns planned-action and dry-run semantics.
- Project adapters execute concrete actions but must not reimplement generic action-engine policy.
- Generic command execution belongs to `build-resources/c420ui/src/command-runner.ts`.
- c420ui operational command logs must pass through `createC420UIOperationalLogEvent()`.
- Do not emit raw secrets from command stdout/stderr when using c420ui operational logs.
- Project adapters must not reimplement stdout/stderr process handling.
- Project adapters may provide concrete command, args, cwd and env only.
- Project adapters should stay thin: load project config, map declarations to c420ui contracts, and delegate generic policy to c420ui.
- Project adapters must not prepare action env after the Action Engine/root provider has prepared it.
- Project adapters must not reimplement command cancellation.
- Runtime app logs remain separate from c420ui operational command logs.
- Direct CLI actions must pass through the c420ui CLI bridge.
- Interactive c420ui actions and direct CLI actions must share the c420ui Action Engine.
- Do not bypass the c420ui Action Engine from `canva-linux-c420ui-builder`.
- Do not reintroduce direct process execution from `build-resources/c420ui/src/terminal/app.ts`.
- Do not import `./process-runner` from the interactive app after the Action Engine migration.
- Do not reintroduce `scripts/c420ui/process-runner.ts` as the interactive execution path.
- Do not keep parallel root/sudo logic for interactive and direct CLI actions.
- Do not hardcode direct action flags in `canva-linux-c420ui-builder`; it does not maintain its own action allowlist.
  Action flags must resolve through the c420ui CLI bridge and Action Registry.
- Direct action flags must come from the project action registry.
- The builder command may parse only global flags such as `--help`, `--yes`, `--force`, and `--dry-run`.
- Keep `bash -n canva-linux-c420ui-builder` protected by validation.
- Keep direct c420ui CLI bridge freshness protected before builder command execution.
- Do not narrow the c420ui CLI entrypoint freshness check to a small hardcoded list of files.
- The builder command must rebuild the c420ui CLI bridge when `build-resources/c420ui/src`, `build-resources/canva-linux/c420ui-adapter`,
  `build-resources/c420ui/src/terminal`, action registry metadata or project UI metadata changes.
- Builder parser tests must not execute real project actions; use a stubbed `build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs`.
- Only one direct action may execute per invocation.
- Dangerous or confirmation-required direct actions must not execute without `--yes`.
- Privileged direct actions must run root/sudo preflight before backend scripts start.
- Dry-run, planned actions and confirmation failures must not trigger sudo/root validation.
- Direct CLI action stdout/stderr must remain visible to the caller.
- Planned direct actions must exit with `78` unless they are dry-run metadata checks.
- Planned direct action dry-runs must exit with `0`.
- Detection refresh must not clear or override progress results.
- Progress refresh must not convert a completed action into an error.
- Installed-version detection must be updated whenever install layout changes.
- Do not import Canva Linux adapters from c420ui generic operations.
- Do not reintroduce `spawnSync`-based host runners.
- Maintenance targets must be declared by the dependent project and passed into generic c420ui operations.
- Legacy `host/command-runner.ts` and `host/sudo.ts` must not be reintroduced.
- All maintenance operations must use Rust-based runners for filesystem/sudo tasks.

## Root/sudo

- Do not run or recommend `./canva-linux-c420ui-builder` as root.
- Never instruct users to run `./canva-linux-c420ui-builder` with sudo.
- The Tool must run as a regular user.
- Privileged operations must request authentication only when needed.
- System-wide actions must declare `requiresRoot`.
- c420ui root authentication must happen before privileged execution.
- c420ui owns generic action scope semantics.
- c420ui owns the generic root provider contract.
- c420ui owns the generic Linux root/sudo provider base.
- c420ui owns `build-resources/c420ui/operations/host/sudo.ts` for reusable privileged host operations.
- c420ui must never import dependent project adapters.
- Dependent project adapters must not reimplement c420ui engines.
- Project-specific strings, env vars and action IDs are forbidden inside `build-resources/c420ui/src`.
- Root launch guard belongs only to c420ui terminal runtime.
- Privileged action policy uses c420ui root provider contracts.
- Canva Linux root provider must remain thin and project-specific.
- Canva Linux owns the concrete root provider configuration backed by `build-resources/c420ui/operations/host/sudo.ts`.
- Do not hardcode Canva Linux env names or helper paths inside c420ui core.
- Do not reimplement generic `validateRootAccess` in project adapters.
- Do not import root/sudo policy from removed legacy runner surfaces inside the Canva Linux adapter.
- Do not call sudo directly from c420ui core.
- Dry-run, planned actions and confirmation failures must not trigger sudo/root validation.
- Sudo/root authentication failures must be shown in a centered c420ui popup.
- Prefer shared sudo helpers over direct sudo calls.
- System-wide actions must use the TypeScript c420ui sudo operation helpers.
- Raw sudo calls are forbidden outside build-resources/c420ui/operations/host/sudo.ts.
- Do not reintroduce the removed project-specific sudo helper.
- The c420ui sudo helper must not contain `CANVA_*` environment variables or project-specific names.
- Project adapters may translate project environment variables into `C420UI_*` variables.
- User-scope actions must never call sudo.
- Sudo contract checks must tolerate valid shell whitespace around assignments.

## Credential storage

- Persistent login must require a secure Linux credential backend.
- Persistent login must require a secure Linux Secret Service backend.
- The secure backend must also have `safeStorage.isEncryptionAvailable() === true`; the selected backend name alone is not sufficient.
- If Electron reports `basic_text`, Canva Linux must use ephemeral session mode.
- `basic_text` must never use the `persist:canva` partition.
- `basic_text` must remain ephemeral even if encryption is reported available.
- Ephemeral session mode must warn the user that login, cookies and credentials will not be saved.
- Do not claim credentials are securely stored when the selected backend is `basic_text`.
- Do not claim credentials are securely stored when the backend is unknown, unverifiable,
  or when a secure backend has unavailable encryption.
- Do not log passwords, cookies, tokens, session values or credential material.
- Persistent Canva login on Linux depends on a secure credential backend with available encryption;
  the selected backend name alone is not sufficient.
- Canva Linux automatically resolves the native credential store for the detected Linux desktop before Electron starts.
  KDE/Plasma tries KWallet first, then the alternate KWallet generation, then Secret Service/libsecret.
  GNOME and Secret Service-compatible desktops try Secret Service/libsecret first, then KWallet compatibility paths.
  Flatpak grants narrow D-Bus access to those credential services without opening the full session bus.
- Secure Electron backend names include `kwallet`, `kwallet5`, `kwallet6`, and `gnome_libsecret`.
- `basic_text` is an insecure fallback and must use ephemeral session mode.
- Unknown or failed credential-backend detection, failed encryption-availability detection,
  and secure backends with unavailable encryption must use ephemeral session mode by caution.
- Do not describe login persistence as universal; document it as native credential-store-backed and safeStorage-gated.
- Do not use `safeStorage.setUsePlainTextEncryption()` to preserve login.
- Do not log cookies, tokens, passwords, session contents or credential material while diagnosing credential storage.

## Logging/privacy

- Never log passwords, sudo stdin, cookies, tokens, or credential material.
- Session log write failures must not fail silently.
- c420ui session logging must not fail silently.
- If the session log stream cannot be opened, the UI must expose a warning without recursion.
- writeSession must not call appendLogText directly to avoid recursion.

## TypeScript-first

- TypeScript is mandatory for all maintained Node.js source code.
- JavaScript is generated output only.
- Shell remains only for documented POSIX/bootstrap boundaries.
- New scripts must be TypeScript unless they are canva-linux-c420ui-builder or run.sh POSIX/bootstrap boundaries.
- New tests must be TypeScript.
- New configs should be TypeScript when tool-supported.
- Do not create new JavaScript source files.
- Do not add `scripts/*.js` as maintained source.
- Do not add `build-resources/tests/*.js`.
- Do not add JavaScript config files when TypeScript config is supported.
- JavaScript may exist only as project-generated output under `.build`, package-managed dependencies under `node_modules`,
  generated coverage output under `coverage`, or distributable output under `dist`.
- Project-generated JavaScript belongs in `.build` only; do not place maintained or project-generated script artifacts elsewhere.
- Shell scripts are allowed only for the documented POSIX/bootstrap boundaries:
  `canva-linux-c420ui-builder` and `run.sh`.
- JSON/YAML/XML/Desktop files remain native data formats and must be validated by TypeScript checks where appropriate.
- Flathub source generation must be TypeScript-backed.
- If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.
- Shell bootstraps may invoke TypeScript entrypoints, but JavaScript wrappers must not be reintroduced.
- If a new script needs logic, create a typed script-specific `.ts` file in the
  owning domain; keep `build-resources/canva-linux/checks/core/*.ts` limited to
  infrastructure checks.
- Do not add maintained JavaScript implementation, test, config, bootstrap, or compatibility-wrapper files.
- Do not duplicate TypeScript core logic in JavaScript fallbacks.
- Do not reintroduce `scripts/run-core-entry.sh`; root `scripts/` is not a fallback build, test, or validation area.
- Flathub/npm source generation logic lives in TypeScript; `npm run flathub:generate-npm-sources`
  invokes `generate-npm-sources.ts` through the TypeScript entry runner.

## CL-EyeDropper

- Preserve CL-EyeDropper.
- The custom EyeDropper flow must route through bundled CL-EyeDropper snapshot canvas picking.
- Do not replace typed `EyeDropperOpenOptions` handling with `any` casts or untyped signal extraction.
- Preserve cleanup of the snapshot host, CL-EyeDropper UI, and Escape/abort listeners.
- Preserve regression tests for snapshot picking and cleanup.

## Packaging/architecture

- Release workflow must build and upload AppImage, Flatpak bundle, linux-unpacked tarball, and SHA256SUMS.
- Release workflow must use deterministic artifact names and must fail if an expected asset is missing or empty.
- Release docs must keep `docs/RELEASE.md` available for GitHub Release notes.
- Release asset architecture names must preserve upstream/tooling architecture names.
- Preserve real generated architecture names such as `x86_64` or `X86_64`.
- Do not normalize `x86_64` or `X86_64` to `x64`.
- AppImage, Flatpak, tarball and checksum entries must use the actual generated architecture string.
- Release docs and workflows must not hardcode `x64` unless the tool actually emits `x64`.


## Validation domains

- Validation domains must remain separated: c420ui core checks, Canva Linux checks, and shared tooling checks.
- Domain checks must stay self-contained unless there is a strong reason to share a helper.
- Do not create `*-parts/` validation directories.
- Do not create one check file per tiny assertion.
- Do not reintroduce one-file-per-assertion validation scripts.
- Prefer consolidated domain checks.
- New c420ui validation belongs inside `check-c420ui-core-contracts.ts`.
- New Canva Linux validation belongs inside `check-canva-linux-contracts.ts`.
- New repository validation belongs inside `check-repository-policy.ts`.
- New repository-wide checks need a dedicated runner only when they cannot fit the consolidated policy runner.
- Do not reintroduce the removed legacy tooling script.
- Do not add new Canva Linux-specific checks to `check:c420ui-core`.
- Do not add standalone `build-resources/canva-linux/checks/core/check-*.ts` files for c420ui or Canva Linux behavior.
- c420ui behavior belongs in `build-resources/c420ui/checks/check-c420ui-core-contracts.ts`.
- Canva Linux behavior belongs in `build-resources/canva-linux/checks/check-canva-linux-contracts.ts`.
- Repository-wide policy belongs in `build-resources/canva-linux/checks/core/check-repository-policy.ts`.
- `build-resources/canva-linux/checks/core/check-*.ts` should be reserved only
  for shared repository infrastructure checks that cannot live inside the
  consolidated runners.
- Do not keep historical `Part` naming after validation fragments are inlined.
- Consolidated validation runners must use domain-oriented function names.
- c420ui public API checks must include every maintained module under `build-resources/c420ui/src`.

## Changelog/review

- Do not remove validation checks to make a build pass.
- Report validations executed and anything not tested.
- Before approving cleanup or simplification, compare the proposed change against `CHANGELOG.md`.
- Do not approve changes that remove, weaken, bypass, or silently alter behavior already documented in `CHANGELOG.md`
  unless the maintainer explicitly requested that change.
- When in doubt, ask for clarification instead of assuming old behavior is disposable.

## Mandatory color semantics

- detected/completed = green
- in progress = yellow
- error/canceled = red
- not detected = purple
- selected action value = default readable text color
- description/help text = default readable text color
- information box main titles = dark blue
- information item titles = green

### Additional color rules

- Only `not detected` should use purple in status output and optional accent usage.

### Adapter and shell-helper boundaries

- Dependent project adapters execute concrete commands only after the c420ui Action Engine has applied planned-action, dry-run, root, and confirmation policy.
- Project adapters must not duplicate Action Engine policy or restore adapter-owned planned/dry-run fallbacks.
- `root scripts/ ownership` is scripts/ must not return; keep npm install, repair, and skip policy in c420ui host dependency management.
- Keep shell helper classifications in `docs/checks/SHELL_HELPERS.md` up to date when adding, removing, or repurposing shell scripts.

## c420ui bootstrap guardrails

Do not edit `build-resources/c420ui/bootstrap/generated/*.mjs` by hand. They are generated artifacts built from TypeScript sources with
`npm run build:c420ui-bootstrap` and kept in the repository so a clean checkout can start c420ui without local npm dependencies.

Do not add `npm install`, `npm ci`, or legacy npm dependency helpers to `canva-linux-c420ui-builder`. The builder command is Stage 0 only:
choose the generated c420ui bootstrap bundle first, keep `.build/scripts` as a development fallback, and let c420ui own the
full dependency policy after startup.

The c420ui bootstrap is explicit ESM. Do not reintroduce CommonJS bootstrap artifacts or `.cjs` fallbacks.


## Bootstrap identity

The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate.
`c420uiVersion` comes from `build-resources/c420ui/package.json`; `dependentProjectVersion` comes from the repository root
`package.json`. Do not collapse them into a single ambiguous `version` field.

## c420ui adapter public keys

The c420ui adapter intentionally exposes both loadProjectInfo and loadProjectConfig. They are different public keys and must not be deduplicated
unless the adapter interface is changed and all callers are updated.

## c420ui startup dependency ordering

Do not add dependent-project dependency repair back to `build-resources/c420ui/scripts/run-c420ui.ts`. Interactive startup must start c420ui
first, then run host dependency validation or repair as a c420ui startup task so failures stay visible in the UI. Keep
Canva Linux-specific dependency wiring in `build-resources/canva-linux/c420ui-adapter/run.ts` or adjacent adapter code, not in c420ui core.

## Versioning and OAuth guardrails

- Do not open `Dev.8` or add `+g<hash>` to source `package.json` / `project-ui.json` values in this phase.
- Generate effective build metadata deterministically from commit metadata only.
- Runtime metadata must fail clearly when generated, source, and committed metadata are all unavailable.
  `0.0.0` fallback metadata is allowed only in explicit tests or marked recovery contexts.
- Normalize generated metadata before using it; partial generated metadata must be ignored rather than converted into broken effective versions.
- Keep post-OAuth reload context-preserving by default; use canonical Canva home only as the post-probe localized public landing fallback.
- Localized OAuth landing detection may use generic auth-signal counts, but must not log DOM text, `aria-label`, `href`,
  `data-testid`, or attribute values.
- Do not log cookie values, token values, OAuth `code`/`state`, or storage values; log only safe counts.
## c420ui logs

- The broken Plain Logs mode was removed from c420ui. The normal logs panel remains the supported log view, and F5 Copy Logs remains available when supported.

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

## Dev11 preload typing

Dev11 keeps preload modules from CommonJS-style TypeScript to typed ESM-style TypeScript.
Preload modules must not use `@ts-nocheck`, `require()`, `module.exports`, or JSDoc typedefs as a substitute for TypeScript types.
Canva Linux and c420ui now use separate deterministic content hashes.
Canva Linux changes update canvaLinuxSourceHash, c420ui changes update
c420uiSourceHash, and combinedSourceHash changes when either side changes.
Git buildRevision remains separate and is only used by effective
metadata/release builds.

## Split source hash guardrails

- Do not collapse `canvaLinuxSourceHash` and `c420uiSourceHash` back into a single global source hash.
- Do not add `build-resources/c420ui/*` to Canva Linux source hash inputs.
- Do not add `build-resources/electron/*` or `scripts/canva-linux/*` to c420ui source hash inputs.
- Do not include `docs/`, `build-resources/tests/`, `.build/`, `dist/`, `node_modules/`, or generated bootstrap artifacts in source hash inputs.
- `buildRevision` is Git/CI/release metadata; deterministic source hashes are content metadata.

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

Shell scripts are allowed only for documented POSIX/bootstrap boundaries: canva-linux-c420ui-builder and run.sh.
