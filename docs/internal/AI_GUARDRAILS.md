# AI Guardrails

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

bootstrap/c420ui/*.cjs are generated artifacts. Do not edit them manually.
Any behavioral change must be made in TypeScript sources and then propagated through npm run build:c420ui-bootstrap.

Dev.8 hotfix: c420ui bootstrap artifacts now have an explicit artifact gate that validates node --check,
known structural corruption patterns, generated-vs-recipe equality, and manifest/build-metadata consistency.

The c420ui bootstrap check must fail if run-c420ui.cjs has syntax errors, stale generated output,
malformed SIGCONT blocks, or host-dependency validators interleaved into the interactive action runner.


Any change to c420ui startup sources, the Canva Linux adapter, dependent-project configs, Canva Linux action or detection scripts,
c420ui package metadata, the bootstrap hash helper, or the bootstrap builder must regenerate the bootstrap bundle with
`npm run build:c420ui-bootstrap`. Do not manually edit generated bootstrap `.cjs` files. Do not leave
`bootstrap/c420ui/manifest.json` with a stale `sourceHash`; run `npm run check:c420ui-bootstrap` before handing off release changes.

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

- Preserve version `0.1.4-15.Dev.8` unless the maintainer explicitly requests a versioning change.
- Do not introduce `0.1.4-dev.14`, `0.1.4-rc.14`, or `0.1.4.14`.
- Preserve the `N.N.N-X` release versioning rule with optional `.Dev.N` development phase suffixes.
- Release identity must use the npm-compatible package version everywhere; do not publish four-number dotted versions.
- Every behavior change must update `CHANGELOG.md`.
- Runtime diagnostics are exposed through the compiled Canva Linux CLI only. Do not reintroduce legacy environment fallback
  inputs for runtime debug or credential-store selection, and do not add app runtime debug flags to `canva-linux-c420ui-builder`.
  Do not use `--debug`; it is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
  Use `--canva-debug=1` or `--canva-debug=2`.



## 0.1.4-14 split documentation policy

- Current maintained release target is `0.1.4-15.Dev.8`.
- OAuth login completion must finalize authorized callbacks by callback type instead of exact URL string equality,
  keep a guarded fallback timer for redirect sequences without a matching `did-finish-load`, defer that fallback while the
  authorized callback WebContents is still loading except after a bounded max-attempt safety limit, flush the shared persistent
  session, run the documented post-flush settle guard, log only safe cookie metadata for `https://www.canva.com`, close the
  popup, and reload the OAuth source tab rather than a generic active tab.
- The release version format must remain `N.N.N-X` with optional `.Dev.N` development phase suffixes.
- Canva Linux is the dependent project; c420ui is the generic engine.
- Canva Linux does not install dependencies directly from builder commands or shell helpers, except for the documented Stage 0
  c420ui bootstrap that starts the generated `bootstrap/c420ui` bundle without npm dependencies.
- Canva Linux does not validate generic artifact recipes; c420ui owns that validation.
- The Canva Linux adapter must not duplicate Action Engine policy for planned actions, dry-run,
  confirmation, root policy, `requestRootAccess`, or fallback execution.
- `scripts/preflight-common.sh` is repository-check-only.
- Split docs must explain controls, non-controls, implementing files, consumed configs/adapters,
  boundary checks, and forbidden regressions.

## Host dependency policy

- c420ui owns host dependency management for command checks, Node minimum checks, npm checks, install strategy, repair/skip modes, messages and exit codes.
- Dependent projects declare dependency config only; for Canva Linux this is `config/canva-linux/dependencies.json`.
- Project builder commands must not run `npm ci`, `npm install`, or dependency repair directly. Stage 0 only starts the generated c420ui bootstrap bundle.
- Project shell helpers must not own npm dependency policy or hardcoded npm dependency lists.
- Builder command bootstrap may only select the generated c420ui bootstrap bundle or the `.build` development fallback.
  Full npm dependency policy remains owned by c420ui.

## Project tree boundaries

- Read `docs/PROJECT_TREE.md` before moving code across Electron, scripts, c420ui, packaging,
  docs, or generated-output boundaries.
- `packages/c420ui/src/terminal/` contains the generic c420ui terminal UI.
- Generic c420ui terminal UI belongs under `packages/c420ui/src/terminal/`.
- Do not reintroduce `scripts/c420ui/`.
- `scripts/core` is infrastructure-check-only; do not add runtime or product entrypoints there.
- Active docs must not reference removed runtime paths except as explicitly historical changelog or roadmap context.
- Terminal diagnostics must use the generic project bridge/detection contract.
- Do not call `scripts/run-core-entry.sh overview-status` from c420ui terminal UI.
- Dependent project adapters live under `scripts/c420ui-adapter/`.
- `scripts/c420ui-adapter/` is project-local adapter-only code, not a public c420ui API.
- Do not create project-specific c420ui adapter directory names; keep the reusable project-local adapter path stable across dependent projects.
- `packages/c420ui/` is a planned standalone package boundary, not a published package promise.
- Do not document c420ui as an externally consumable package until the maintainer explicitly requests publication.
- Keep generated output in `.build/`, `dist/`, `coverage/`, or `repo/`; do not treat it as maintained source.


## c420ui separation roadmap

### c420ui terminal startup and root guard

- The c420ui terminal runtime owns the root launch guard.
- Do not add root launch checks to `scripts/run-c420ui.ts`.
- Do not add root launch checks to `scripts/c420ui-adapter/run.ts`.
- Project adapters must not expose `rootLaunchGuardMessage`.
- The Canva Linux root provider is only for privileged actions, not for launching the terminal UI.


### c420ui package boundary

- Read `docs/ROADMAP_C420UI_SEPARATION.md` before moving c420ui code toward packages or adapters.
- Separate for compatibility first and external extraction later.
- Do not migrate c420ui to ESM during the current separation phase.
- Do not publish or promise an NPM package during the current separation phase.
- Do not reintroduce `scripts/c420ui/`.
- Do not change visual behavior as part of package-boundary work.
- Do not reintroduce `scripts/core/action-runner.ts`.
- Do not reintroduce `check:legacy-compat`.
- Do not document Action Runner as an available execution path.
- Do not change versioning as part of c420ui separation.
- Detection framework belongs to `packages/c420ui/src/detection.ts`.
- Canva Linux detection probes belong to `scripts/canva-linux/detection/`.
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
- Artifact workflow execution belongs to `packages/c420ui/src/workflow-runner.ts`.
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
- Backend shell scripts may remain shell scripts, but shell UI menus are forbidden.
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

- c420ui/CLI actions must be sourced from `config/canva-linux/actions.json`.
- Action metadata must come from `config/canva-linux/actions.json`.
- Canva Linux project configuration belongs under `config/canva-linux/`.
- `config/canva-linux/actions.json`, `config/canva-linux/development.json`, and `config/canva-linux/artifacts.json` are project-owned declarations.
- Do not put project configuration under `scripts/`.
- Canva Linux action registry loading belongs under `scripts/canva-linux/actions/`.
- Do not reintroduce `scripts/core/action-registry.ts`.
- Do not reintroduce `scripts/core/validate-actions.ts`.
- Generic c420ui action validation belongs in `packages/c420ui/src/actions.ts`.
- Do not duplicate action logic in c420ui or builder command code.
- Do not ignore `action.env` from `config/canva-linux/actions.json`.
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
- Generic command execution belongs to `packages/c420ui/src/command-runner.ts`.
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
- Do not reintroduce direct process execution from `packages/c420ui/src/terminal/app.ts`.
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
- The builder command must rebuild the c420ui CLI bridge when `packages/c420ui/src`, `scripts/c420ui-adapter`,
  `packages/c420ui/src/terminal`, action registry metadata or project UI metadata changes.
- Builder parser tests must not execute real project actions; use a stubbed `bootstrap/c420ui/run-c420ui-cli.cjs`.
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
- c420ui owns `packages/c420ui/host/linux/sudo-helper.sh` for reusable privileged host operations.
- c420ui must never import dependent project adapters.
- Dependent project adapters must not reimplement c420ui engines.
- Project-specific strings, env vars and action IDs are forbidden inside `packages/c420ui/src`.
- Root launch guard belongs only to c420ui terminal runtime.
- Privileged action policy uses c420ui root provider contracts.
- Canva Linux root provider must remain thin and project-specific.
- Canva Linux owns the concrete root provider configuration backed by `packages/c420ui/host/linux/sudo-helper.sh`.
- Do not hardcode Canva Linux env names or helper paths inside c420ui core.
- Do not reimplement generic `validateRootAccess` in project adapters.
- Do not import root/sudo policy from removed legacy runner surfaces inside the Canva Linux adapter.
- Do not call sudo directly from c420ui core.
- Dry-run, planned actions and confirmation failures must not trigger sudo/root validation.
- Sudo/root authentication failures must be shown in a centered c420ui popup.
- Prefer shared sudo helpers over direct sudo calls.
- System-wide actions must use packages/c420ui/host/linux/sudo-helper.sh.
- Raw sudo calls are forbidden outside packages/c420ui/host/linux/sudo-helper.sh.
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
- Shell remains shell for host operations.
- New scripts must be TypeScript unless they are shell scripts for host operations.
- New tests must be TypeScript.
- New configs should be TypeScript when tool-supported.
- Do not create new JavaScript source files.
- Do not add `scripts/*.js` as maintained source.
- Do not add `test/*.js`.
- Do not add JavaScript config files when TypeScript config is supported.
- JavaScript may exist only as project-generated output under `.build`, package-managed dependencies under `node_modules`,
  generated coverage output under `coverage`, or distributable output under `dist`.
- Project-generated JavaScript belongs in `.build` only; do not place maintained or project-generated script artifacts elsewhere.
- Shell scripts are allowed only for Linux host operations, builder command glue, Flatpak/native install, sudo, purge, XDG,
  and validation that must run before Node.
- JSON/YAML/XML/Desktop files remain native data formats and must be validated by TypeScript checks where appropriate.
- Flathub source generation must be TypeScript-backed.
- If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.
- Shell bootstraps may invoke TypeScript entrypoints, but JavaScript wrappers must not be reintroduced.
- If a new script needs logic, create a typed script-specific `.ts` file in the owning domain; keep `scripts/core/*.ts` limited to infrastructure checks.
- Do not add maintained JavaScript implementation, test, config, bootstrap, or compatibility-wrapper files.
- Do not duplicate TypeScript core logic in JavaScript fallbacks.
- `scripts/run-core-entry.sh` must only build or run compiled TypeScript core entries; it must not contain fallback
  implementations of status, registry, runner, validation, or detection contracts.
- Flathub/npm source generation logic lives in TypeScript; `packaging/flathub/scripts/generate-npm-sources.sh`
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
- Do not add standalone `scripts/core/check-*.ts` files for c420ui or Canva Linux behavior.
- c420ui behavior belongs in `packages/c420ui/checks/check-c420ui-core-contracts.ts`.
- Canva Linux behavior belongs in `scripts/checks/canva-linux/check-canva-linux-contracts.ts`.
- Repository-wide policy belongs in `scripts/core/check-repository-policy.ts`.
- `scripts/core/check-*.ts` should be reserved only for shared repository infrastructure checks that cannot live inside the consolidated runners.
- Do not keep historical `Part` naming after validation fragments are inlined.
- Consolidated validation runners must use domain-oriented function names.
- c420ui public API checks must include every maintained module under `packages/c420ui/src`.

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
- `scripts/preflight-common.sh` is repository-check-only; keep npm install, repair, and skip policy in c420ui host dependency management.
- Keep shell helper classifications in `docs/checks/SHELL_HELPERS.md` up to date when adding, removing, or repurposing shell scripts.

## c420ui bootstrap guardrails

Do not edit `bootstrap/c420ui/*.cjs` by hand. They are generated artifacts built from TypeScript sources with
`npm run build:c420ui-bootstrap` and kept in the repository so a clean checkout can start c420ui without local npm dependencies.

Do not add `npm install`, `npm ci`, or legacy npm dependency helpers to `canva-linux-c420ui-builder`. The builder command is Stage 0 only:
choose the generated c420ui bootstrap bundle first, keep `.build/scripts` as a development fallback, and let c420ui own the
full dependency policy after startup.

Do not migrate the bootstrap to ESM in incidental changes. The current bundle is explicit CommonJS; ESM remains future work
that requires its own planned change.


## Bootstrap identity

The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate.
`c420uiVersion` comes from `packages/c420ui/package.json`; `dependentProjectVersion` comes from the repository root
`package.json`. Do not collapse them into a single ambiguous `version` field.

## c420ui startup dependency ordering

Do not add dependent-project dependency repair back to `scripts/run-c420ui.ts`. Interactive startup must start c420ui
first, then run host dependency validation or repair as a c420ui startup task so failures stay visible in the UI. Keep
Canva Linux-specific dependency wiring in `scripts/c420ui-adapter/run.ts` or adjacent adapter code, not in c420ui core.

## Versioning and OAuth guardrails

- Do not open `Dev.8` or add `+g<hash>` to source `package.json` / `project-ui.json` values in this phase.
- Generate effective build metadata deterministically from commit metadata only.
- Runtime fallback metadata must never hardcode the current Canva Linux phase; if generated metadata and source files are
  unavailable, use neutral `0.0.0` values with `buildRevision: "unknown"`.
- Normalize generated metadata before using it; partial generated metadata must be ignored rather than converted into broken effective versions.
- Keep post-OAuth reload context-preserving by default; use canonical Canva home only as the post-probe localized public landing fallback.
- Localized OAuth landing detection may use generic auth-signal counts, but must not log DOM text, `aria-label`, `href`,
  `data-testid`, or attribute values.
- Do not log cookie values, token values, OAuth `code`/`state`, or storage values; log only safe counts.
## Dev.7 hotfix guardrails

- c420ui must display Canva Linux effective build metadata when `config/canva-linux/build-metadata.json`, CI revision
  variables, or a source checkout `.git` HEAD can provide it; source `package.json` and `project-ui.json` stay free of
  committed `+g<hash>` metadata.
- The c420ui brand version remains independent and comes from `packages/c420ui/package.json`; c420ui-specific
  `0.1.0+g<hash-do-c420ui>` metadata is future work, not part of this hotfix.
- `build:c420ui-bootstrap` must refresh or resolve effective build metadata before writing the bootstrap manifest, including
  dependent project full version, build revision, display version, and phase.
- MediaDevices diagnostics must preserve native receiver binding for `getUserMedia` and `getDisplayMedia`, including detached
  calls, and must not log token/cookie/code/state values.
- Toolbar favicons must respect the internal CSP by rendering only `data:` and `file:` image URLs, falling back instead of
  rendering remote `https:` favicons.
- OAuth localized public-landing probes must normalize both DOM attributes and localized keywords with NFKD so composed and
  decomposed labels are equivalent.
