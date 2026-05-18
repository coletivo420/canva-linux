# RC Validation Matrix

This internal maintenance checklist tracks the active `0.1.4-15.Dev.9` detected-installation hash visibility handoff. It records the commands, manual
checks, GPU/display runtime diagnostics, Flatpak credential diagnostics, and release blockers that must be reviewed before
tagging or publishing `v0.1.4-15.Dev.9`.

Dev.6 closes the post-migration cleanup phase: dead-code audit, obsolete validation-contract cleanup, streamlined smoke tests,
runtime CLI diagnostics cleanup, and GPU/display `runtime-options` logging. Historical migration checks should be simplified after
stabilization, while active behavior boundaries such as `--option=value` runtime CLI parsing remain covered. GPU/display RC
validation must inspect the central log for `gpu:runtime runtime-options`; the log must include `source=runtime-cli`,
`gpuBackend`, `displayOverride`, `forceX11`, `forceWayland`, and `disableWaylandColorManager`.

## Release candidate metadata

| Field | Value |
| --- | --- |
| Release target | `0.1.4-15.Dev.9` |
| Tag target | `v0.1.4-15.Dev.9` |
| Versioning rule | `N.N.N-X.Dev.Y` |
| Validation date | `2026-05-16` (UTC) |
| Validated commit | `pending Dev.9 validation` |
| Validation environment | Container `74e762e34260`; `Linux 74e762e34260 6.12.47 #1 SMP Mon Oct 27 10:01:15 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux`; Node.js `v20.20.2`; npm `11.4.2` (npm emitted `Unknown env config "http-proxy"` warnings); `electron`, `flatpak`, `appstreamcli`, `desktop-file-validate`, `appimagetool`, and `linuxdeploy` were not installed. Direct `./canva-linux-c420ui-builder` non-dry-run startup is blocked in root containers; direct dry-runs are permitted for validation. |

## Required automated command matrix

Every required automated command must be recorded with its status during RC validation. Use `pass`, `fail`, `blocked`, or `not run` in the status column when executing the release candidate review.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `npm run check:c420ui-core` | Pass | The generic c420ui engine contracts, action engine behavior, root provider boundaries, terminal UI contracts, and artifact workflow rules pass without regressions. | The shared c420ui engine may have lost generic behavior, duplicated dependent-project policy, or reintroduced forbidden action/root/artifact regressions. | c420ui core |
| `npm run check:canva-linux` | Pass | The Canva Linux adapter, project config, runtime boundaries, release metadata, AppStream metadata, package identity, and project-specific scripts pass. | The dependent-project adapter or release metadata may be out of sync with `0.1.4-15.Dev.9`, may duplicate c420ui policy, or may change runtime behavior unexpectedly. | Canva Linux project adapter |
| `npm run check:shared-tooling` | Pass | Shared repository policy, documentation links, AI guardrails, dependency policy, runtime-build checks, and repository policy checks pass. | Shared tooling, policy, docs, or runtime-build guardrails may be stale or weakened. | shared repository tooling |
| `npm run check:scripts-core` | Pass | TypeScript compilation and contracts for the maintained `scripts/core` validation infrastructure pass. | Core validation scripts may fail to build or may no longer enforce the repository policy surface. | shared repository tooling |
| `npm run validate` | Pass | The consolidated validation command completes the maintained project validation sequence successfully. | A required validation domain failed, or the consolidated release validation surface is incomplete. | release metadata |
| `npm run docs:check-links` | Pass | Documentation links resolve and do not point to removed or stale files. | Release, validation, or maintenance docs may contain broken links or stale references. | documentation |
| `npm run docs:check-ai` | Pass | AI maintenance guardrails, split documentation depth, review checklist requirements, and this RC validation matrix remain present. | Required AI/release guardrails may have been removed, weakened, or desynchronized before RC validation. | documentation |
| `npm run lint` | Pass | Maintained source passes the configured lint rules. | Source style, static rules, or policy-enforced syntax may have regressed. | runtime build |
| `npm run typecheck` | Pass | Standard TypeScript checking completes without type errors. | Maintained TypeScript may no longer satisfy the standard project type contract. | runtime build |
| `npm run typecheck:strict` | Pass | Strict TypeScript checking completes without type errors. | Strict type-safety expectations for the release candidate may have regressed. | runtime build |
| `npm test` | Pass | The automated test suite passes without changing runtime behavior. | Behavior covered by tests may have regressed or the test environment may be incomplete. | runtime build |
| `npm run build:c420ui-bootstrap` then `npm run check:c420ui-bootstrap` | Required before RC sign-off | Regenerates the c420ui bootstrap bundle and manifest, then verifies the manifest source hash, valid JavaScript syntax, and generated artifact equality from the shared build recipe without additional generated-file drift. | Bootstrap artifacts may be stale relative to TypeScript sources or project configuration. | c420ui bootstrap |
| `./scripts/validate-project.sh` | Blocked: environment lacks `flatpak` | The shell-level project validation runner completes the required validation sequence. | The release candidate failed the top-level validation entrypoint or a required command is not runnable from shell validation. | release metadata |

## Manual RC validation matrix

These commands are manual release-candidate checks. Record their output in the release notes or validation log when executing RC validation. Dry-run commands must not alter installed packages, bundles, credentials, runtime data, or user configuration.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `node -p "require('./bootstrap/c420ui/manifest.json').c420uiVersion" && node -p "require('./bootstrap/c420ui/manifest.json').dependentProjectVersion"` | Required for bootstrap RC validation | Bootstrap identity reports c420ui engine version from `packages/c420ui/package.json` and dependent-project version from the root `package.json`. | The bootstrap manifest may have collapsed engine and dependent-project identity into one ambiguous version. | c420ui bootstrap |
| `rm -rf node_modules .build && ./canva-linux-c420ui-builder --doctor --dry-run` | Required for bootstrap RC validation; root containers may record blocked | A clean checkout starts direct c420ui CLI through `bootstrap/c420ui/run-c420ui-cli.cjs` without a missing `esbuild` failure or launcher-side npm install. | Stage 0 bootstrap or Stage 1 dependency ownership may be broken. | c420ui bootstrap |
| `rm -rf node_modules .build && ./canva-linux-c420ui-builder` | Required for bootstrap RC validation; root containers may record blocked | A clean checkout starts interactive c420ui through `bootstrap/c420ui/run-c420ui.cjs` before dependent-project dependency repair appears in the UI logs. | The bootstrap may still block on dependency repair before the UI is mounted. | c420ui bootstrap |
| `npm run c420ui -- --help` | Pass | c420ui help starts through the maintained launcher and documents the current terminal UI and command surface. | The c420ui entrypoint, help text, or launcher path may be broken. | c420ui core |
| `npm run c420ui:cli -- --doctor --dry-run` | Pass | c420ui CLI doctor resolves the project adapter and reports planned checks without making changes. | The c420ui CLI bridge or dependent-project adapter contract may be broken. | c420ui core |
| `./canva-linux-c420ui-builder --help` | Blocked: validation container runs as root | Direct Canva Linux CLI help works and remains aligned with the documented command surface. | The direct CLI launcher or help contract may be broken. | Canva Linux project adapter |
| `./canva-linux-c420ui-builder --prepare-aur --dry-run` | Required; root containers may record blocked | One planned-action dry-run resolves through the c420ui CLI bridge without expanding builder smoke coverage. | Planned-action routing, dry-run behavior, or c420ui bridge delegation may have regressed. | Canva Linux project adapter |
| `./canva-linux-c420ui-builder --canva-debug=1` | Required; root containers may record blocked before dispatch | Runtime flags are rejected by the builder and remain owned by the compiled runtime app. | Builder/runtime separation may have been weakened. | Canva Linux project adapter |
| `flatpak run io.github.coletivo420.canva-linux --debug=1` | Required in a Flatpak-capable environment | The wrapper exits with `Canva Linux: --debug is reserved by Electron/Node.` and tells users to use `--canva-debug=1` or `--canva-debug=2`. | Flatpak may pass Electron-reserved debug flags through before Canva Linux can reject them. | Canva Linux runtime |

## OAuth source-tab login validation

Run the runtime with debug logging, complete Google OAuth, and inspect the central log:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

Expected sequence:

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

The cookie summary may include counts for persistent, session, secure, and HTTP-only cookies only. It must not include cookie values, OAuth codes, states, tokens, or session IDs. OAuth finalization must no longer depend on exact callback URL string equality: authorized callbacks are finalized by callback type, the guarded fallback timer covers redirect sequences where Electron reports the callback in navigation events without a matching `did-finish-load`, defers while the authorized callback WebContents is still loading except after a bounded max-attempt safety limit, and the post-flush settle delay is documented as a shared-session propagation guard between popup and source WebContents. The post-OAuth reload must target the recorded source tab when its `sourceWebContentsId` resolves; fallback to the active tab is acceptable only when logged with `fallback=true`.

## GPU/display runtime diagnostics manual validation

Run Canva Linux with GPU/display runtime flags and inspect the central log for `gpu:runtime runtime-options`. The expected line
shape is:

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

For the software backend with Wayland forcing and Wayland color-manager disabling, the central log must include:

```text
gpu:runtime runtime-options source=runtime-cli gpuBackend=software displayOverride=wayland forceX11=false forceWayland=true disableWaylandColorManager=true
```

## Dependency-backed manual packaging checks

Run these only in an environment with the required packaging dependencies. If dependencies are unavailable, record the environment limitation instead of treating the command as passed.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `./packages/c420ui/scripts/build-appimage.sh` | Blocked: environment lacks AppImage tooling | Builds the AppImage artifact for `0.1.4-15.Dev.9` with the generated architecture string preserved in the artifact name. | AppImage build prerequisites, packaging scripts, release metadata, or artifact naming may be broken. | release metadata |
| `./packages/c420ui/scripts/build-flatpak-bundle.sh` | Blocked: environment lacks `flatpak` | Builds the Flatpak bundle for `0.1.4-15.Dev.9` with AppStream metadata and generated architecture naming intact. | Flatpak build prerequisites, packaging scripts, AppStream metadata, or artifact naming may be broken. | release metadata |
| `./scripts/validate-flatpak.sh` | Blocked: environment lacks `flatpak`, `appstreamcli`, and `desktop-file-validate` | Validates Flatpak metadata and bundle policy for the current release candidate. | Flatpak metadata, AppStream, desktop integration, or bundle validation policy may have regressed. | release metadata |

## RC validation execution log

Automated validation was executed on `2026-05-14` against commit `75853e9e08ca56a1b0b6aec13fe5ed3b74625d1a`. The maintained npm checks passed. The shell-level project validator reached the Flatpak validation step and was environment-blocked because `flatpak` is not installed in this container.

Manual dry-runs were executed in the same environment. The npm c420ui launchers passed. Direct
`./canva-linux-c420ui-builder` invocations were environment-blocked because this non-interactive validation container runs as
root, and the launcher correctly refuses root execution before dispatching help or planned-action dry-run flows.

Release-blocker greps were reviewed with these commands: `git grep -n "0.1.4-12"`; `git grep -n "0.1.4-dev.14\|0.1.4-rc.14\|0.1.4.14"`; `git grep -n "scripts/c420ui-canva-linux"`; `git grep -n "scripts/c420ui/"`; `git grep -n "ensure-npm-dependencies.sh"`; `git grep -n "CANVA_REQUIRED_NPM_DEPS"`; `git grep -n "CANVA_SKIP_NPM_INSTALL\|CANVA_NPM_REPAIR"`; and `git grep -n "x64" docs config scripts packages`. The matches for old versions, forbidden version forms, retired paths, and `x64` are historical changelog entries, guardrails, validation code, tests, or non-artifact contexts such as icon-size paths. No project-owned artifact name was found using `x64`, `CANVA_REQUIRED_NPM_DEPS` was absent, `CANVA_SKIP_NPM_INSTALL` / `CANVA_NPM_REPAIR` were absent, and the retired runtime paths did not exist on disk.

## Standalone c420ui bootstrap validation

Validation was executed on `2026-05-15` against commit `f12cb1bc4e744fa25eeb42194942b43c94341361` in container `3a93e95dcdd3` with Node.js `v20.20.2` and npm `11.4.2`. The first bootstrap build/check ran before removing `node_modules`; clean-checkout launcher checks then removed `node_modules` and `.build`, confirmed `esbuild` was not resolvable, and exercised the committed bootstrap entrypoints. Direct `./canva-linux-c420ui-builder` validation remains blocked in this container because it runs as root and the launcher intentionally stops before dispatching to c420ui.

| Check | Status | Evidence |
| --- | --- | --- |
| Bootstrap bundle exists | Pass | `bootstrap/c420ui/run-c420ui.cjs` and `bootstrap/c420ui/run-c420ui-cli.cjs` are committed bootstrap entrypoints; `node bootstrap/c420ui/run-c420ui-cli.cjs --help` passed after `rm -rf node_modules .build`. |
| c420ui version is independent | Pass | `bootstrap/c420ui/manifest.json` records `c420uiVersion` as `0.1.0`. |
| Dependent project version is separate | Pass | `bootstrap/c420ui/manifest.json` records `dependentProjectVersion` as `0.1.4-15.Dev.9`. |
| Source hash matches current sources | Pass | `npm run build:c420ui-bootstrap` followed by `npm run check:c420ui-bootstrap` passed after reverting the intentional stale-hash edit. |
| Stale hash detection works | Pass | After `printf '\n' >> scripts/build-c420ui-bootstrap.ts`, `npm run check:c420ui-bootstrap` failed with `bootstrap/c420ui/manifest.json: sourceHash is stale; run npm run build:c420ui-bootstrap`. |
| Launcher does not install npm deps | Pass | `rg -n "npm (install\|ci)\|npm\\s+install\|npm\\s+ci" canva-linux-c420ui-builder` returned no matches; `canva-linux-c420ui-builder` resolves `bootstrap/c420ui/run-c420ui-cli.cjs` before the `.build` fallback. |
| Clean checkout starts without esbuild | Blocked: environment limitation | After `rm -rf node_modules .build`, `node -e "require.resolve('esbuild')"` reported `esbuild not resolvable`; `node bootstrap/c420ui/run-c420ui-cli.cjs --help` and `node bootstrap/c420ui/run-c420ui-cli.cjs --doctor --dry-run` passed, but `./canva-linux-c420ui-builder --help`, `./canva-linux-c420ui-builder --doctor --dry-run`, and `./canva-linux-c420ui-builder` exited at the root-user guard before launcher dispatch. |
| Dependency repair runs after UI startup | Blocked: environment limitation | Source wiring keeps dependency repair in the c420ui startup task list, but the interactive `./canva-linux-c420ui-builder` UI startup could not be validated in this root, non-interactive container. |

## Release blockers

The release candidate must not be tagged or published while any blocker below is present:

- `package.json` version differs from `0.1.4-15.Dev.9`.
- `package-lock.json` top-level version differs from `0.1.4-15.Dev.9`.
- `package-lock.json` root package version differs from `0.1.4-15.Dev.9`.
- Active project UI metadata does not use display version `0.1.4-15.Dev` and phase `0.1.4-15.Dev.9`.
- Any release identity uses `0.1.4-dev.14`, `0.1.4-rc.14`, or `0.1.4.14`.
- Project-owned artifact names use `x64` instead of the generated architecture name such as `x86_64` or `X86_64`.
- `scripts/c420ui-canva-linux` reappears.
- `scripts/c420ui/` reappears.
- `ensure-npm-dependencies.sh` reappears.
- c420ui core contains Canva Linux hardcoding.
- The Canva Linux adapter duplicates planned-action, dry-run, root, or confirmation policy that belongs to c420ui.
- Runtime Electron behavior changes without an explicit maintainer request.

## RC decision rule

`v0.1.4-15.Dev.9` may be tagged only after every required automated command has a recorded passing result, every applicable manual dry-run has the expected result, dependency-backed packaging checks are either passing or explicitly recorded as environment-blocked, and no release blocker remains open.

## c420ui bootstrap release requirement

The RC matrix must include a clean-checkout startup check for the standalone c420ui bootstrap bundle. The expected behavior is that c420ui starts from `bootstrap/c420ui` without `node_modules`, local `esbuild`, or a prior npm install; full dependency validation and repair then continue inside c420ui. The bootstrap remains CommonJS for `0.1.4-15.Dev.9`; ESM is future work only.

The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate: `c420uiVersion` is sourced
from `packages/c420ui/package.json`, while `dependentProjectVersion` is sourced from the repository root `package.json`.

The source-hash check must pass without modifying files after the build step. Any change to c420ui sources, the Canva Linux adapter or config, the bootstrap hash helper, or the bootstrap builder must be followed by `npm run build:c420ui-bootstrap`; a stale `sourceHash` or committed `.cjs` artifact that fails syntax or build-recipe comparison blocks RC sign-off until the command refreshes the bundle and manifest.

Interactive bootstrap validation must confirm the UI starts first and dependent-project dependency repair runs as a c420ui
startup task, not as pre-UI logic in `scripts/run-c420ui.ts`.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.

## Dev.7 effective-version and OAuth checks

Historical guardrail fragments for this phase remain `0.1.4-15.Dev.7` and `v0.1.4-15.Dev.7` so AI
checks can verify the archived Dev.7 validation context while the active RC target advances.

- Confirm source version remains `0.1.4-15.Dev.9`, display version remains `0.1.4-15.Dev`, and phase remains `0.1.4-15.Dev.9`.
- Confirm runtime startup logs and `--version` expose effective `+g<short-hash>` metadata when the build revision is known.
- Confirm OAuth post-login reload preserves editor/design/folder URLs and only falls back to `https://www.canva.com/` after localized public landing detection.
- Confirm c420ui remains independently versioned at `0.1.0`; future c420ui build metadata belongs to a later independent c420ui phase.
