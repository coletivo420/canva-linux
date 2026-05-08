# Changelog

## Unreleased

### Added
- Added the initial c420ui action engine contract for resolving and running project actions through bridges.
- Added an explicit English-only maintained repository language guardrail with future i18n architecture
  requirements for source, comments, UI strings, README, docs, changelog, and AI maintenance instructions.
- Added the Canva Linux c420ui adapter boundary for project-specific metadata, action, path and root-guard wiring.
- Added the private future `@coletivo420/c420ui` package skeleton with pure c420ui TypeScript contracts.
- Added the public c420ui separation roadmap for compatibility-first package and adapter boundary work.
- Added Secret Service-backed credential storage documentation and validation.
- Added ephemeral session fallback when Linux credential storage falls back to `basic_text` or when a secure backend cannot provide available encryption.
- Documented secure Linux credential storage through Secret Service backends plus available safe storage encryption as the requirement for persistent login,
  with ephemeral session fallback guidance.
- Added auxiliary maintenance policy files for Codex, Claude, and Gemini so AI agents have non-public project guidance without duplicating public documentation.
- Added review checklist coverage for agent policy, versioning, Action Runner behavior, c420ui naming, docs/changelog
  updates, logging safety, and CL-EyeDropper preservation.
- Added c420ui rebuild inputs for project metadata and the action registry so metadata-only changes trigger a rebuilt terminal UI bundle.
- Added current manual validation coverage for c420ui, Action Runner planned exits, root policy, TypeScript-first source
  rules, Native/Flatpak scopes, AppImage artifacts, CL-EyeDropper, and `CANVA_DEBUG=1` / `CANVA_DEBUG=2`.

### Changed
- Moved generic c420ui TypeScript config contracts from `scripts/c420ui/app.ts` into the private `packages/c420ui` skeleton.
- Canva Linux no longer treats persistent login as available when no secure Linux Secret Service backend is detected
  or when safe storage encryption is unavailable.
- Startup diagnostics now explain whether persistent login is available or the app is running in ephemeral session mode.
- Clarified that Canva Linux does not promise universal login persistence; persistent sessions depend on `kwallet`,
  `kwallet5`, `kwallet6`, `gnome_libsecret`, or a compatible Secret Service provider, plus available encryption.
- Deduplicated agent guardrail wording while preserving root, logging/privacy, header separation, and TypeScript-first rules.
- Reorganized AI guardrails into focused maintenance sections for language/public docs, versioning, c420ui,
  Action Registry, root/sudo, logging/privacy, TypeScript-first source, CL-EyeDropper, packaging/architecture,
  and changelog/review.
- Updated manual validation to reflect the current `0.1.4-12` release instead of obsolete development-cycle guidance.
- Moved the old release checklist to `docs/internal/legacy/RELEASE_CHECKLIST_1.4.10.md` and marked it as historical.
- Consolidated the public changelog into a release-focused summary and archived granular development-cycle history internally.

### Fixed
- Hardened c420ui CLI bridge freshness detection for launcher direct actions.
- Repaired the shell launcher parser after the direct CLI bridge migration.
- Added validation coverage to prevent hardcoded launcher action flags and malformed shell parsing.
- Rebuild the direct c420ui CLI bridge when launcher-relevant bridge sources are newer than the compiled bundle.
- Fixed the release workflow removed-interface-routing check so it scans active public documentation while excluding
  archived internal development history.
- Fixed c420ui stale-build detection so changes to `scripts/project-ui.json`, `scripts/app-identity-common.sh`,
  or `scripts/actions.json` are considered build inputs.
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
- Fixed Action Runner planned-action handling so planned exit `78` is not reported as a successful action.
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
  Action Engine while preserving the legacy Action Runner for compatibility checks.
- Added direct-action validation so multiple direct action flags fail before execution with exit code `64`.
- Restored confirmation, root/sudo preflight, and stdout/stderr forwarding for direct c420ui CLI bridge execution.
- Preserved planned direct action exit semantics: planned actions exit `78`, and planned dry-runs exit `0`.
- Updated launcher branding to use lowercase `c420ui`.
