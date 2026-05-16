# Changelog

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
See [c420ui Builder Alias Policy](docs/c420ui/BUILDER_ALIAS.md).

## Unreleased

- Hardened the Dev.5 builder/runtime split: `canva-linux-c420ui-builder` no longer maintains a direct-action allowlist,
  delegates action flags to the c420ui CLI bridge and Action Registry, rejects runtime flag namespaces,
  and never bypasses the root launch guard for dry-runs.
- Tightened runtime CLI parsing so valued options require `--option=value`, conflicting X11/Wayland forcing is rejected,
  `--force-wayland` requires a Wayland session, and the legacy `CANVA_DISABLE_GPU` fallback stays removed.

## [0.1.4-15.Dev.5] - 2026-05-16

### Added
- Introduced `canva-linux-c420ui-builder` as the official builder application.
- Added the public builder title: Canva Linux Builder powered by c420ui.

### Changed
- Removed the legacy `canva-linux.sh` compatibility entrypoint.
- Kept `canva-linux-c420ui-builder` as the Canva Linux public alias for the builder.
- Renamed internal builder source and bootstrap artifacts to `c420ui-builder`.
- Separated the builder/c420ui CLI from the compiled `canva-linux` runtime CLI.
- Applied runtime GPU/display CLI flags outside Flatpak so native, linux-unpacked, and AppImage launches use the same runtime parser behavior.
- Cleaned runtime CLI review issues from PR #138, including redundant exits, duplicate parser messages, and credential-store normalization.


## [0.1.4-14] - 2026-05-14

### Changed
- Bumped package metadata to `0.1.4-14` while preserving the `N.N.N-X` release versioning rule.
- Added AppStream release metadata for `0.1.4-14`.
- Validated the standalone c420ui bootstrap bundle for clean source checkouts without local `node_modules` or local `esbuild`.
- Added sourceHash validation for `bootstrap/c420ui` artifacts and confirmed stale bundle detection.
- Confirmed c420ui remains the independent dependency resolver for dependent projects, with Canva Linux dependencies repaired after c420ui startup.
- Split documentation into generic c420ui, Canva Linux dependent-project, and internal maintenance sections.
- Refreshed public release, validation, review, and AI maintenance docs for the consolidated c420ui separation state.
- Expanded c420ui, Canva Linux, and internal split docs with ownership, implementation, boundary checks, and forbidden-regression coverage.
- Added split documentation depth checks so placeholder docs cannot replace the maintained split references.

### Fixed
- Removed stale inline release-status changelog entries from startup logging so release details live only in the changelog.
- Kept tab creation timestamps as real creation times and use the tab id only as a secondary ordering tiebreaker.
- Added diagnostics when generated popup windows are closed or cannot be closed by the tab event policy.
- Fixed c420ui terminal startup so `npm run c420ui` uses the project runner instead of executing the terminal package barrel.
- Consolidated duplicate Canva Linux artifact action validation in checks and removed duplicate source-string tests from the behavioral suite.
- Kept artifact configuration process-static in the adapter loader and documented the path-based cache.

### Documentation
- Updated validation and AI maintenance docs to reflect the completed c420ui CLI, Action Engine, Root Provider, Command Runner,
  operational log, and consolidated validation migrations.
- Updated maintenance documentation to remove legacy runner compatibility guidance.
- Clarified that Canva Linux actions, development tasks, and artifact workflows are project config declarations loaded by a thin adapter.

### Added
- Added generic c420ui host dependency runner modules for command, Node and npm dependency checks.
- Added formal dependent-project boundary documentation and checks to keep c420ui generic and Canva Linux project-specific.
- Added the initial c420ui action engine contract for resolving and running project actions through bridges.
- Added an explicit English-only maintained repository language guardrail with future i18n architecture
  requirements for source, comments, UI strings, README, docs, changelog, and AI maintenance instructions.
- Added the Canva Linux c420ui adapter boundary for project-specific metadata, action and path wiring.
- Added the private future `@coletivo420/c420ui` package skeleton with pure c420ui TypeScript contracts.
- Added the public c420ui separation roadmap for compatibility-first package and adapter boundary work.
- Documented secure Linux credential storage through Secret Service backends plus available safe storage encryption as the requirement for persistent login,
  with ephemeral session fallback guidance.
- Added auxiliary maintenance policy files for Codex, Claude, and Gemini so AI agents have non-public project guidance without duplicating public documentation.
- Added review checklist coverage for agent policy, versioning, removed legacy runner behavior, c420ui naming, docs/changelog
  updates, logging safety, and CL-EyeDropper preservation.
- Added c420ui rebuild inputs for project metadata and the action registry so metadata-only changes trigger a rebuilt terminal UI bundle.
- Added current manual validation coverage for c420ui, planned exits, root policy, TypeScript-first source
  rules, Native/Flatpak scopes, AppImage artifacts, CL-EyeDropper, and `CANVA_DEBUG=1` / `CANVA_DEBUG=2`.

### Changed
- Slimmed the Canva Linux c420ui adapter so `runAction()` only executes concrete commands after the c420ui
  Action Engine applies planned-action, dry-run, root, and confirmation policy.
- Classified remaining shell helpers as c420ui host tools, Canva Linux recipes, repository checks, or obsolete
  helpers, and documented `scripts/preflight-common.sh` as repository-check-only.
- Hardened c420ui host dependency management with config validation, dry-run planned commands, npm declaration checks, and executable command lookup.
- Renamed the project-local c420ui adapter directory to `scripts/c420ui-adapter/` so future dependent projects can reuse the same path pattern.
- Moved host dependency policy into c420ui so the generic runner owns command, Node and npm checks, npm install strategy, repair mode and skip mode.
  Canva Linux now declares dependencies in config.
- Strengthened c420ui, Canva Linux adapter, and shared tooling checks for dependent-project boundary enforcement.
- Clarified custom scope validation policy and made Linux root validation command construction configurable.
- Centralized generic action scope semantics and Linux root/sudo provider helpers in c420ui.
- Slimmed the Canva Linux root provider so it only owns project-specific root policy.
- Centralized the c420ui root launch guard inside the c420ui terminal runtime.
- Kept `build:c420ui` as an isolated terminal package surface smoke build; it is not the runtime launcher.
- Moved the generic c420ui terminal UI into `packages/c420ui/src/terminal`.
- Tightened post-split repository policy so `scripts/core` is infrastructure-check-only and the retired runtime/config paths stay removed.
- Moved terminal install-detection matching to project action metadata so `packages/c420ui/src` no longer hardcodes Canva Linux action IDs.
- Kept `build:c420ui` as the isolated c420ui terminal UI smoke/build target while moving its generated bundle under `.build/packages/c420ui/terminal/`.
- Added the c420ui artifact workflow runner and kept Canva Linux artifact recipes as project-specific configuration.
- Tightened the c420ui detection provider contract and removed the legacy `package` overview status shape.
- Moved installation overview detection to the generic c420ui detection engine with a Canva Linux provider under `scripts/canva-linux/detection/`.
- Moved Canva Linux action registry and project UI config under `config/canva-linux/`.
- Moved Canva Linux action registry loading to `scripts/canva-linux/actions/registry.ts` and kept generic action validation in c420ui core.
- Updated maintenance documentation to treat the c420ui Action Engine, Root Provider, Command Runner,
  and CLI bridge as the only supported action execution path.
- Polished consolidated validation runner naming and expanded the c420ui public API contract.
- Folded remaining standalone core checks into the consolidated validation runners.
- Consolidated validation into c420ui core, Canva Linux, and shared tooling domains.
- Inlined validation fragment logic into the consolidated c420ui core, Canva Linux, and repository policy runners,
  and removed the obsolete validation parts directories.
- Added c420ui operational log redaction and command cancellation policy.
- Moved reusable operational command execution into the c420ui command runner.
- Routed interactive c420ui action execution through the shared c420ui Action Engine and root provider.
- Moved direct CLI root/sudo preflight into the c420ui root provider contract with a Canva Linux provider backed by `packages/c420ui/host/linux/sudo-helper.sh`.
- Moved generic c420ui TypeScript config contracts from `packages/c420ui/src/terminal/app.ts` into the private `packages/c420ui` skeleton.
- Canva Linux no longer treats persistent login as available when no secure Linux Secret Service backend is detected
  or when safe storage encryption is unavailable.
- Startup diagnostics now explain whether persistent login is available or the app is running in ephemeral session mode.
- Clarified that Canva Linux does not promise universal login persistence; persistent sessions depend on `kwallet`,
  `kwallet5`, `kwallet6`, `gnome_libsecret`, or a compatible Secret Service provider, plus available encryption.
- Deduplicated agent guardrail wording while preserving root, logging/privacy, header separation, and TypeScript-first rules.
- Reorganized AI guardrails into focused maintenance sections for language/public docs, versioning, c420ui,
  Action Registry, root/sudo, logging/privacy, TypeScript-first source, CL-EyeDropper, packaging/architecture,
  and changelog/review.
- Updated manual validation to reflect the current `0.1.4-14` release and consolidated documentation split.
- Moved the old release checklist to `docs/internal/legacy/RELEASE_CHECKLIST_1.4.10.md` and marked it as historical.
- Consolidated the public changelog into a release-focused summary and archived granular development-cycle history internally.

### Removed
- Removed the obsolete npm dependency bootstrap shell script and the repository preflight fallback that referenced it.
- Removed the `scripts/run-core-entry.sh overview-status` dispatch path so the core wrapper only runs infrastructure checks.
- Removed stale cross-domain c420ui core contract assertions that duplicated Canva Linux adapter checks.
- Removed the old `scripts/core/overview-status.ts` product detection entry from shared core tooling.
- Removed the old `scripts/actions.json` and `scripts/project-ui.json` config locations.
- Removed the old `scripts/core/action-registry.ts` and `scripts/core/validate-actions.ts` entries.
- Removed the legacy Action Runner and its manual compatibility validation path after direct CLI and interactive c420ui
  execution were migrated to the shared c420ui Action Engine.

### Fixed
- Routed c420ui terminal diagnostics through the project bridge instead of the removed overview-status entrypoint.
- Routed Canva Linux artifact workflow actions through the shared c420ui Action Engine and Root Provider instead of calling the project adapter directly.
- Avoided duplicate action environment preparation in the Canva Linux adapter.
- Interactive action cancellation now reports a canceled progress state before execution.
- Restored interactive c420ui root-auth environment propagation and Ctrl+C cancellation for Action Engine-backed actions.
- Hardened c420ui CLI bridge freshness detection for launcher direct actions.
- Repaired the shell launcher parser after the direct CLI bridge migration.
- Added validation coverage to prevent hardcoded launcher action flags and malformed shell parsing.
- Rebuild the direct c420ui CLI bridge when launcher-relevant bridge sources are newer than the compiled bundle.
- Fixed the release workflow removed-interface-routing check so it scans active public documentation while excluding
  archived internal development history.
- Fixed c420ui stale-build detection so changes to `config/canva-linux/project-ui.json`, `scripts/app-identity-common.sh`,
  or `config/canva-linux/actions.json` are considered build inputs.
- Fixed public manual-validation guidance that still referenced obsolete release/version wording and debug-filter terminology.

### Tests
- Added behavioral launcher parser coverage with a stubbed c420ui CLI entrypoint.

## [0.1.4-12] - 2026-05-07

### Added
- Added root-launch protection for the Canva Linux Install and Development Tool so it runs as a regular user and requests privilege only when needed.
- Added c420ui Application Settings for general Tool logs and terminal text selection in the logs panel.
- Added guardrail checks for root launch, c420ui settings, Tool logging, log selection, header layout, branding,
  project boundaries, release contracts, TypeScript-first source, source integrity, and runtime build artifacts.
- Added F6 plain logs fallback with the session log path for manual log selection.
- Added release preparation documentation for `0.1.4-12` artifacts and workflow expectations.
- Added CL-EyeDropper regression coverage for bundled snapshot canvas picking, cleanup, and typed `EyeDropperOpenOptions` handling.

### Changed
- Consolidated c420ui as the user-facing terminal interface name and removed obsolete terminal-interface product naming from current public docs.
- Refactored c420ui into reusable brand and project metadata boundaries, with separate fixed c420ui and project headers.
- Changed c420ui session logging to append to launcher-created logs instead of truncating them and to surface session stream failures visibly.
- Separated Tool logs from Action logs in the c420ui logs panel.
- Hardened c420ui manual text selection so mouse capture is updated globally while keyboard navigation and F5/F6 log copy remain available.
- Updated release artifact generation and documentation to preserve real generated architecture strings such as `x86_64` or `X86_64`.
- Updated project identity so release naming, docs, workflow tags, and `package.json` use the npm-compatible `0.1.4-12` version.

### Fixed
- Fixed planned-action handling so planned exit `78` is not reported as a successful action.
- Fixed centralized root/sudo handling for privileged actions, user-scope sudo refusal, and c420ui authentication prompts.
- Fixed startup error reporting around the Electron ready flow so startup failures are caught and logged.
- Fixed Flatpak and Native system/user install behavior, detection refreshes, scope handling, and post-install warning finalization.
- Fixed installed-version rendering for Native, Flatpak, and AppImage variants.
- Fixed c420ui detection and progress refresh behavior so completed results are not overwritten by stale refresh state.
- Fixed logging safety for circular objects, BigInt, Error, Function, arbitrary Electron objects, and session write failures.
- Fixed release validation to fail when expected AppImage, Flatpak, tarball, or checksum artifacts are missing or empty.

## Historical development notes

Detailed development-cycle history was archived in:
- docs/internal/CHANGELOG_DEVELOPMENT_HISTORY.md

## 0.1.4-12 — Commit 13 direct CLI bridge migration

- Migrated direct launcher actions to the c420ui CLI bridge and reusable c420ui
  Action Engine.
- Added direct-action validation so multiple direct action flags fail before execution with exit code `64`.
- Restored confirmation, root/sudo preflight, and stdout/stderr forwarding for direct c420ui CLI bridge execution.
- Preserved planned direct action exit semantics: planned actions exit `78`, and planned dry-runs exit `0`.
- Updated launcher branding to use lowercase `c420ui`.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance,
and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.
