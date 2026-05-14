# RC Validation Matrix

This internal maintenance checklist turns the `0.1.4-14` release candidate preparation into an objective validation gate. It records the commands, manual checks, and release blockers that must be reviewed before tagging or publishing `v0.1.4-14`.

## Release candidate metadata

| Field | Value |
| --- | --- |
| Release target | `0.1.4-14` |
| Tag target | `v0.1.4-14` |
| Versioning rule | `N.N.N-X` |
| Validation date | Fill in the UTC date when the RC validation is executed. |
| Validated commit | Fill in the full Git commit SHA that was validated. |
| Validation environment | Fill in OS, architecture, Node.js version, npm version, Electron packaging dependencies, Flatpak/AppImage tooling availability, and any container or CI constraints. |

## Required automated command matrix

Every required automated command must be recorded with its status during RC validation. Use `pass`, `fail`, `blocked`, or `not run` in the status column when executing the release candidate review.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `npm run check:c420ui-core` | Not run in this template. | The generic c420ui engine contracts, action engine behavior, root provider boundaries, terminal UI contracts, and artifact workflow rules pass without regressions. | The shared c420ui engine may have lost generic behavior, duplicated dependent-project policy, or reintroduced forbidden action/root/artifact regressions. | c420ui core |
| `npm run check:canva-linux` | Not run in this template. | The Canva Linux adapter, project config, runtime boundaries, release metadata, AppStream metadata, package identity, and project-specific scripts pass. | The dependent-project adapter or release metadata may be out of sync with `0.1.4-14`, may duplicate c420ui policy, or may change runtime behavior unexpectedly. | Canva Linux project adapter |
| `npm run check:shared-tooling` | Not run in this template. | Shared repository policy, documentation links, AI guardrails, dependency policy, runtime-build checks, and repository policy checks pass. | Shared tooling, policy, docs, or runtime-build guardrails may be stale or weakened. | shared repository tooling |
| `npm run check:scripts-core` | Not run in this template. | TypeScript compilation and contracts for the maintained `scripts/core` validation infrastructure pass. | Core validation scripts may fail to build or may no longer enforce the repository policy surface. | shared repository tooling |
| `npm run validate` | Not run in this template. | The consolidated validation command completes the maintained project validation sequence successfully. | A required validation domain failed, or the consolidated release validation surface is incomplete. | release metadata |
| `npm run docs:check-links` | Not run in this template. | Documentation links resolve and do not point to removed or stale files. | Release, validation, or maintenance docs may contain broken links or stale references. | documentation |
| `npm run docs:check-ai` | Not run in this template. | AI maintenance guardrails, split documentation depth, review checklist requirements, and this RC validation matrix remain present. | Required AI/release guardrails may have been removed, weakened, or desynchronized before RC validation. | documentation |
| `npm run lint` | Not run in this template. | Maintained source passes the configured lint rules. | Source style, static rules, or policy-enforced syntax may have regressed. | runtime build |
| `npm run typecheck` | Not run in this template. | Standard TypeScript checking completes without type errors. | Maintained TypeScript may no longer satisfy the standard project type contract. | runtime build |
| `npm run typecheck:strict` | Not run in this template. | Strict TypeScript checking completes without type errors. | Strict type-safety expectations for the release candidate may have regressed. | runtime build |
| `npm test` | Not run in this template. | The automated test suite passes without changing runtime behavior. | Behavior covered by tests may have regressed or the test environment may be incomplete. | runtime build |
| `./scripts/validate-project.sh` | Not run in this template. | The shell-level project validation runner completes the required validation sequence. | The release candidate failed the top-level validation entrypoint or a required command is not runnable from shell validation. | release metadata |

## Manual RC validation matrix

These commands are manual release-candidate checks. Record their output in the release notes or validation log when executing RC validation. Dry-run commands must not alter installed packages, bundles, credentials, runtime data, or user configuration.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `npm run c420ui -- --help` | Not run in this template. | c420ui help starts through the maintained launcher and documents the current terminal UI and command surface. | The c420ui entrypoint, help text, or launcher path may be broken. | c420ui core |
| `npm run c420ui:cli -- --doctor --dry-run` | Not run in this template. | c420ui CLI doctor resolves the project adapter and reports planned checks without making changes. | The c420ui CLI bridge or dependent-project adapter contract may be broken. | c420ui core |
| `./canva-linux.sh --help` | Not run in this template. | Direct Canva Linux CLI help works and remains aligned with the documented command surface. | The direct CLI launcher or help contract may be broken. | Canva Linux project adapter |
| `./canva-linux.sh --doctor --dry-run` | Not run in this template. | Doctor runs in dry-run mode without changing host state and reports planned validation actions. | Dry-run or doctor routing may be broken in the dependent project. | Canva Linux project adapter |
| `./canva-linux.sh --bundle-appimage --dry-run` | Not run in this template. | AppImage bundling reports the planned workflow and preserves generated artifact architecture naming. | AppImage workflow routing, dry-run behavior, or artifact naming may have regressed. | release metadata |
| `./canva-linux.sh --bundle-flatpak --dry-run` | Not run in this template. | Flatpak bundling reports the planned workflow and preserves generated artifact architecture naming. | Flatpak workflow routing, dry-run behavior, or artifact naming may have regressed. | release metadata |
| `./canva-linux.sh --purge --yes --dry-run` | Not run in this template. | Purge reports planned destructive actions without deleting files or triggering unintended root behavior. | Purge dry-run, confirmation, or root policy may have regressed. | Canva Linux project adapter |

## Dependency-backed manual packaging checks

Run these only in an environment with the required packaging dependencies. If dependencies are unavailable, record the environment limitation instead of treating the command as passed.

| Command | Status | Expected result | Failure meaning | Owner domain |
| --- | --- | --- | --- | --- |
| `./scripts/build-appimage.sh` | Not run in this template. | Builds the AppImage artifact for `0.1.4-14` with the generated architecture string preserved in the artifact name. | AppImage build prerequisites, packaging scripts, release metadata, or artifact naming may be broken. | release metadata |
| `./scripts/build-flatpak-bundle.sh` | Not run in this template. | Builds the Flatpak bundle for `0.1.4-14` with AppStream metadata and generated architecture naming intact. | Flatpak build prerequisites, packaging scripts, AppStream metadata, or artifact naming may be broken. | release metadata |
| `./scripts/validate-flatpak.sh` | Not run in this template. | Validates Flatpak metadata and bundle policy for the current release candidate. | Flatpak metadata, AppStream, desktop integration, or bundle validation policy may have regressed. | release metadata |

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
