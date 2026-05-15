# RC Validation Matrix

This internal maintenance checklist turns the `0.1.4-14` release candidate preparation into an objective validation gate. It records the commands, manual checks, and release blockers that must be reviewed before tagging or publishing `v0.1.4-14`.

## Release candidate metadata

| Field | Value |
| --- | --- |
| Release target | `0.1.4-14` |
| Tag target | `v0.1.4-14` |
| Versioning rule | `N.N.N-X` |
| Validation date | `2026-05-14` (UTC) |
| Validated commit | `75853e9e08ca56a1b0b6aec13fe5ed3b74625d1a` |
| Validation environment | Container `74e762e34260`; `Linux 74e762e34260 6.12.47 #1 SMP Mon Oct 27 10:01:15 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux`; Node.js `v20.20.2`; npm `11.4.2` (npm emitted `Unknown env config "http-proxy"` warnings); `electron`, `flatpak`, `appstreamcli`, `desktop-file-validate`, `appimagetool`, and `linuxdeploy` were not installed. Direct `./canva-linux.sh` dry-runs were blocked because the validation container runs as root and the launcher correctly refuses root execution. |

## Required automated command matrix

Every required automated command must be recorded with its status during RC validation. Use `pass`, `fail`, `blocked`, or `not run` in the status column when executing the release candidate review.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `npm run check:c420ui-core` | Pass | The generic c420ui engine contracts, action engine behavior, root provider boundaries, terminal UI contracts, and artifact workflow rules pass without regressions. | The shared c420ui engine may have lost generic behavior, duplicated dependent-project policy, or reintroduced forbidden action/root/artifact regressions. | c420ui core |
| `npm run check:canva-linux` | Pass | The Canva Linux adapter, project config, runtime boundaries, release metadata, AppStream metadata, package identity, and project-specific scripts pass. | The dependent-project adapter or release metadata may be out of sync with `0.1.4-14`, may duplicate c420ui policy, or may change runtime behavior unexpectedly. | Canva Linux project adapter |
| `npm run check:shared-tooling` | Pass | Shared repository policy, documentation links, AI guardrails, dependency policy, runtime-build checks, and repository policy checks pass. | Shared tooling, policy, docs, or runtime-build guardrails may be stale or weakened. | shared repository tooling |
| `npm run check:scripts-core` | Pass | TypeScript compilation and contracts for the maintained `scripts/core` validation infrastructure pass. | Core validation scripts may fail to build or may no longer enforce the repository policy surface. | shared repository tooling |
| `npm run validate` | Pass | The consolidated validation command completes the maintained project validation sequence successfully. | A required validation domain failed, or the consolidated release validation surface is incomplete. | release metadata |
| `npm run docs:check-links` | Pass | Documentation links resolve and do not point to removed or stale files. | Release, validation, or maintenance docs may contain broken links or stale references. | documentation |
| `npm run docs:check-ai` | Pass | AI maintenance guardrails, split documentation depth, review checklist requirements, and this RC validation matrix remain present. | Required AI/release guardrails may have been removed, weakened, or desynchronized before RC validation. | documentation |
| `npm run lint` | Pass | Maintained source passes the configured lint rules. | Source style, static rules, or policy-enforced syntax may have regressed. | runtime build |
| `npm run typecheck` | Pass | Standard TypeScript checking completes without type errors. | Maintained TypeScript may no longer satisfy the standard project type contract. | runtime build |
| `npm run typecheck:strict` | Pass | Strict TypeScript checking completes without type errors. | Strict type-safety expectations for the release candidate may have regressed. | runtime build |
| `npm test` | Pass | The automated test suite passes without changing runtime behavior. | Behavior covered by tests may have regressed or the test environment may be incomplete. | runtime build |
| `npm run build:c420ui-bootstrap` then `npm run check:c420ui-bootstrap` | Required before RC sign-off | Regenerates the c420ui bootstrap bundle and manifest, then verifies the manifest source hash without additional generated-file drift. | Bootstrap artifacts may be stale relative to TypeScript sources or project configuration. | c420ui bootstrap |
| `./scripts/validate-project.sh` | Blocked: environment lacks `flatpak` | The shell-level project validation runner completes the required validation sequence. | The release candidate failed the top-level validation entrypoint or a required command is not runnable from shell validation. | release metadata |

## Manual RC validation matrix

These commands are manual release-candidate checks. Record their output in the release notes or validation log when executing RC validation. Dry-run commands must not alter installed packages, bundles, credentials, runtime data, or user configuration.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `node -p "require('./bootstrap/c420ui/manifest.json').c420uiVersion" && node -p "require('./bootstrap/c420ui/manifest.json').dependentProjectVersion"` | Required for bootstrap RC validation | Bootstrap identity reports c420ui engine version from `packages/c420ui/package.json` and dependent-project version from the root `package.json`. | The bootstrap manifest may have collapsed engine and dependent-project identity into one ambiguous version. | c420ui bootstrap |
| `rm -rf node_modules .build && ./canva-linux.sh --doctor --dry-run` | Required for bootstrap RC validation; root containers may record blocked | A clean checkout starts direct c420ui CLI through `bootstrap/c420ui/run-c420ui-cli.cjs` without a missing `esbuild` failure or launcher-side npm install. | Stage 0 bootstrap or Stage 1 dependency ownership may be broken. | c420ui bootstrap |
| `rm -rf node_modules .build && ./canva-linux.sh` | Required for bootstrap RC validation; root containers may record blocked | A clean checkout starts interactive c420ui through `bootstrap/c420ui/run-c420ui.cjs` before dependent-project dependency repair appears in the UI logs. | The bootstrap may still block on dependency repair before the UI is mounted. | c420ui bootstrap |
| `npm run c420ui -- --help` | Pass | c420ui help starts through the maintained launcher and documents the current terminal UI and command surface. | The c420ui entrypoint, help text, or launcher path may be broken. | c420ui core |
| `npm run c420ui:cli -- --doctor --dry-run` | Pass | c420ui CLI doctor resolves the project adapter and reports planned checks without making changes. | The c420ui CLI bridge or dependent-project adapter contract may be broken. | c420ui core |
| `./canva-linux.sh --help` | Blocked: validation container runs as root | Direct Canva Linux CLI help works and remains aligned with the documented command surface. | The direct CLI launcher or help contract may be broken. | Canva Linux project adapter |
| `./canva-linux.sh --doctor --dry-run` | Blocked: validation container runs as root | Doctor runs in dry-run mode without changing host state and reports planned validation actions. | Dry-run or doctor routing may be broken in the dependent project. | Canva Linux project adapter |
| `./canva-linux.sh --bundle-appimage --dry-run` | Blocked: validation container runs as root | AppImage bundling reports the planned workflow and preserves generated artifact architecture naming. | AppImage workflow routing, dry-run behavior, or artifact naming may have regressed. | release metadata |
| `./canva-linux.sh --bundle-flatpak --dry-run` | Blocked: validation container runs as root | Flatpak bundling reports the planned workflow and preserves generated artifact architecture naming. | Flatpak workflow routing, dry-run behavior, or artifact naming may have regressed. | release metadata |
| `./canva-linux.sh --purge --yes --dry-run` | Blocked: validation container runs as root | Purge reports planned destructive actions without deleting files or triggering unintended root behavior. | Purge dry-run, confirmation, or root policy may have regressed. | Canva Linux project adapter |

## Dependency-backed manual packaging checks

Run these only in an environment with the required packaging dependencies. If dependencies are unavailable, record the environment limitation instead of treating the command as passed.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `./scripts/build-appimage.sh` | Blocked: environment lacks AppImage tooling | Builds the AppImage artifact for `0.1.4-14` with the generated architecture string preserved in the artifact name. | AppImage build prerequisites, packaging scripts, release metadata, or artifact naming may be broken. | release metadata |
| `./scripts/build-flatpak-bundle.sh` | Blocked: environment lacks `flatpak` | Builds the Flatpak bundle for `0.1.4-14` with AppStream metadata and generated architecture naming intact. | Flatpak build prerequisites, packaging scripts, AppStream metadata, or artifact naming may be broken. | release metadata |
| `./scripts/validate-flatpak.sh` | Blocked: environment lacks `flatpak`, `appstreamcli`, and `desktop-file-validate` | Validates Flatpak metadata and bundle policy for the current release candidate. | Flatpak metadata, AppStream, desktop integration, or bundle validation policy may have regressed. | release metadata |


## RC validation execution log

Automated validation was executed on `2026-05-14` against commit `75853e9e08ca56a1b0b6aec13fe5ed3b74625d1a`. The maintained npm checks passed. The shell-level project validator reached the Flatpak validation step and was environment-blocked because `flatpak` is not installed in this container.

Manual dry-runs were executed in the same environment. The npm c420ui launchers passed. Direct `./canva-linux.sh` invocations were environment-blocked because this non-interactive validation container runs as root, and the launcher correctly refuses root execution before dispatching help, doctor, bundle, or purge flows.

Release-blocker greps were reviewed with these commands: `git grep -n "0.1.4-12"`; `git grep -n "0.1.4-dev.14\|0.1.4-rc.14\|0.1.4.14"`; `git grep -n "scripts/c420ui-canva-linux"`; `git grep -n "scripts/c420ui/"`; `git grep -n "ensure-npm-dependencies.sh"`; `git grep -n "CANVA_REQUIRED_NPM_DEPS"`; `git grep -n "CANVA_SKIP_NPM_INSTALL\|CANVA_NPM_REPAIR"`; and `git grep -n "x64" docs config scripts packages`. The matches for old versions, forbidden version forms, retired paths, and `x64` are historical changelog entries, guardrails, validation code, tests, or non-artifact contexts such as icon-size paths. No project-owned artifact name was found using `x64`, `CANVA_REQUIRED_NPM_DEPS` was absent, `CANVA_SKIP_NPM_INSTALL` / `CANVA_NPM_REPAIR` were absent, and the retired runtime paths did not exist on disk.

## Release blockers

The release candidate must not be tagged or published while any blocker below is present:

- `package.json` version differs from `0.1.4-14`.
- `package-lock.json` top-level version differs from `0.1.4-14`.
- `package-lock.json` root package version differs from `0.1.4-14`.
- AppStream metadata does not contain release `0.1.4-14`.
- Any release identity uses `0.1.4-dev.14`, `0.1.4-rc.14`, or `0.1.4.14`.
- Project-owned artifact names use `x64` instead of the generated architecture name such as `x86_64` or `X86_64`.
- `scripts/c420ui-canva-linux` reappears.
- `scripts/c420ui/` reappears.
- `ensure-npm-dependencies.sh` reappears.
- c420ui core contains Canva Linux hardcoding.
- The Canva Linux adapter duplicates planned-action, dry-run, root, or confirmation policy that belongs to c420ui.
- Runtime Electron behavior changes without an explicit maintainer request.

## RC decision rule

`v0.1.4-14` may be tagged only after every required automated command has a recorded passing result, every applicable manual dry-run has the expected result, dependency-backed packaging checks are either passing or explicitly recorded as environment-blocked, and no release blocker remains open.

## c420ui bootstrap release requirement

The RC matrix must include a clean-checkout startup check for the standalone c420ui bootstrap bundle. The expected behavior is that c420ui starts from `bootstrap/c420ui` without `node_modules`, local `esbuild`, or a prior npm install; full dependency validation and repair then continue inside c420ui. The bootstrap remains CommonJS for `0.1.4-14`; ESM is future work only.

The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate: `c420uiVersion` is sourced
from `packages/c420ui/package.json`, while `dependentProjectVersion` is sourced from the repository root `package.json`.

The source-hash check must pass without modifying files after the build step. A stale `sourceHash` in `bootstrap/c420ui/manifest.json` blocks RC sign-off until `npm run build:c420ui-bootstrap` refreshes the bundle and manifest.

Interactive bootstrap validation must confirm the UI starts first and dependent-project dependency repair runs as a c420ui
startup task, not as pre-UI logic in `scripts/run-c420ui.ts`.
