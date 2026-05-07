# Changelog

## Unreleased

### Added
- Documented secure Linux credential storage through Secret Service backends as the requirement for persistent login, with ephemeral session fallback guidance.
- Added auxiliary maintenance policy files for Codex, Claude, and Gemini so AI agents have non-public project guidance without duplicating public documentation.
- Added review checklist coverage for agent policy, versioning, Action Runner behavior, C420UI naming, docs/changelog
  updates, logging safety, and CL-EyeDropper preservation.
- Added C420UI rebuild inputs for project metadata and the action registry so metadata-only changes trigger a rebuilt terminal UI bundle.
- Added current manual validation coverage for C420UI, Action Runner planned exits, root policy, TypeScript-first source
  rules, Native/Flatpak scopes, AppImage artifacts, CL-EyeDropper, and `CANVA_DEBUG=1` / `CANVA_DEBUG=2`.

### Changed
- Clarified that Canva Linux does not promise universal login persistence; persistent sessions depend on `kwallet`,
  `kwallet5`, `kwallet6`, `gnome_libsecret`, or a compatible Secret Service provider.
- Deduplicated agent guardrail wording while preserving root, logging/privacy, header separation, and TypeScript-first rules.
- Reorganized AI guardrails into focused maintenance sections for language/public docs, versioning, C420UI,
  Action Registry, root/sudo, logging/privacy, TypeScript-first source, CL-EyeDropper, packaging/architecture,
  and changelog/review.
- Updated manual validation to reflect the current `0.1.4-12` release instead of obsolete development-cycle guidance.
- Moved the old release checklist to `docs/internal/legacy/RELEASE_CHECKLIST_1.4.10.md` and marked it as historical.
- Consolidated the public changelog into a release-focused summary and archived granular development-cycle history internally.

### Fixed
- Fixed C420UI stale-build detection so changes to `scripts/project-ui.json`, `scripts/app-identity-common.sh`,
  or `scripts/actions.json` are considered build inputs.
- Fixed public manual-validation guidance that still referenced obsolete release/version wording and debug-filter terminology.

## [0.1.4-12] - 2026-05-07

### Added
- Added root-launch protection for the Canva Linux Install and Development Tool so it runs as a regular user and requests privilege only when needed.
- Added C420UI Application Settings for general Tool logs and terminal text selection in the logs panel.
- Added guardrail checks for root launch, C420UI settings, Tool logging, log selection, header layout, branding,
  project boundaries, release contracts, TypeScript-first source, source integrity, and runtime build artifacts.
- Added F6 plain logs fallback with the session log path for manual log selection.
- Added release preparation documentation for `0.1.4-12` artifacts and workflow expectations.
- Added CL-EyeDropper regression coverage for bundled snapshot canvas picking, cleanup, and typed `EyeDropperOpenOptions` handling.

### Changed
- Consolidated C420UI as the user-facing terminal interface name and removed obsolete terminal-interface product naming from current public docs.
- Refactored C420UI into reusable brand and project metadata boundaries, with separate fixed C420UI and project headers.
- Changed C420UI session logging to append to launcher-created logs instead of truncating them and to surface session stream failures visibly.
- Separated Tool logs from Action logs in the C420UI logs panel.
- Hardened C420UI manual text selection so mouse capture is updated globally while keyboard navigation and F5/F6 log copy remain available.
- Updated release artifact generation and documentation to preserve real generated architecture strings such as `x86_64` or `X86_64`.
- Updated project identity so release naming, docs, workflow tags, and `package.json` use the npm-compatible `0.1.4-12` version.

### Fixed
- Fixed Action Runner planned-action handling so planned exit `78` is not reported as a successful action.
- Fixed centralized root/sudo handling for privileged actions, user-scope sudo refusal, and C420UI authentication prompts.
- Fixed startup error reporting around the Electron ready flow so startup failures are caught and logged.
- Fixed Flatpak and Native system/user install behavior, detection refreshes, scope handling, and post-install warning finalization.
- Fixed installed-version rendering for Native, Flatpak, and AppImage variants.
- Fixed C420UI detection and progress refresh behavior so completed results are not overwritten by stale refresh state.
- Fixed logging safety for circular objects, BigInt, Error, Function, arbitrary Electron objects, and session write failures.
- Fixed release validation to fail when expected AppImage, Flatpak, tarball, or checksum artifacts are missing or empty.

## Historical development notes

Detailed development-cycle history was archived in:
- docs/internal/CHANGELOG_DEVELOPMENT_HISTORY.md
