# AI-Assisted Development Guidelines

This document defines project conventions for AI-assisted development and vibecoding in the `1.4.10-dev.17` cycle.

## Language and communication conventions

- Human-facing assistant responses should be written in Portuguese.
- Source code, inline code comments, and repository documentation must stay in English.
- Keep technical wording precise and consistent with existing project terminology.

## Development workflow expectations

- Always update `CHANGELOG.md` for each development delivery.
- Always bump project version metadata for dev deliveries.
- Run `npm run docs:check-links` when changing markdown files that add or edit local document references.
- Prefer small, reviewable patches that are easy to revert.
- Avoid large architecture changes without explicit scope validation.
- Preserve the stable/dev workflow already used by this repository.

## Scope guardrails

- Do not revive native Linux/Wayland OAuth popup icon work unless explicitly requested.
- Keep runtime behavior unchanged when a patch is documentation/readability-only.
- Keep `electron/preload/canva.bundle.js` generated-only; edit the modular preload sources and regenerate the bundle with `npm run build:preload`.
- Do not pass untrusted or unsupported URL schemes to Electron's system opener.
- Keep eyedropper snapshot IPC scoped to the requesting Canva tab.

## Custom colorpicker directive

This repository has an explicit runtime directive for Canva color picking:

- always use the bundled `ltcodedev/eyedropper` implementation as the Canva Linux custom colorpicker
- do not introduce or promote native browser color pickers, desktop portals, or Chromium screen-capture flows as the primary Canva colorpicker behavior
- if a diagnostic or compatibility hook touches `getDisplayMedia`, `getUserMedia`, `showPicker`, or native `EyeDropper`, it must exist only to route Canva back into the bundled custom picker
- when reviewing regressions, treat divergence away from `ltcodedev/eyedropper` as a bug unless the maintainer explicitly changes this policy
- remove dormant or not-implemented picker APIs when they are outside the active Canva Linux canvas-based flow

## Readability conventions

- When touching shell scripts, config-like files, or large source files, use `##` section markers when they improve readability.
- Keep build and release scripts readable with short `##` section markers.
- Add code comments for non-obvious flow, cross-module relationships, lifecycle coupling, and platform-specific behavior.
- Prefer comments that explain why a path exists or how two modules interact, especially across `main`, `preload`, and shared helpers.
- Do not over-comment obvious code paths or restate what the code already says.
- Keep section markers short, descriptive, and in English.

## Commenting expectations for AI changes

- When extracting code into new modules, leave a short comment near the integration point explaining the relationship between the old owner and the new module.
- When a helper exists to preserve runtime behavior during refactors, comment that constraint explicitly.
- When a file remains intentionally large because behavior is still being stabilized, note that in code or documentation so future sessions do not assume it is accidental.
- New modules should start with a short purpose comment when their responsibility is not obvious from the filename alone.

## Grounding for future AI sessions

Before proposing or applying changes, align with the current state documented in:

- `README.md`
- `CHANGELOG.md`
- `docs/TECHNICAL.md`
- `docs/FLATHUB.md`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/AI_DEVELOPMENT.md`

After meaningful refactors, update the relevant repository documentation so future AI sessions can understand:

- where runtime responsibilities live now
- why modules were split the way they were
- which files still concentrate behavior and are expected next refactor targets
- when a generated artifact such as the Canva preload bundle is required before runtime or packaging validation
- when a release bundle must rebuild Electron output and the Flatpak repo instead of reusing stale generated artifacts

## Cycle summary

For this cycle, keep this focus explicit:

`1.4.10-dev.17 = public naming cleanup and Canva-Linux identity standardization with Flatpak app-id migration to com.canva.Linux.`

## Planned phase roadmap

The `1.4.10-dev.X` cycle now follows an explicit phased plan:

- `1.4.10-dev.10` - preparation: documentation, roadmap, and AI/vibecoding guidance
- `1.4.10-dev.11` - extract the window-open policy into a testable module
- `1.4.10-dev.12` - add unit tests with `node:test`
- `1.4.10-dev.14` - add light wiring/integration tests for the main-process tab flow
- `1.4.10-dev.15` - add Electron smoke tests with Playwright
- `1.4.10-dev.16` - finalize follow-up Flathub adaptations after the testing foundation lands
- `1.4.10-dev.17` - public naming cleanup and project identity standardization
- `1.4.10-dev.18` - final permissions pruning/justification pass
- `1.4.10-dev.19` - branding/trademark/app-id/metainfo finalization strategy
- `1.4.10-dev.20` - final submission-manifest validation pass
- `1.4.10-dev.21` - RC/stable closure work

Patch intent rules for this phased plan:

- `dev.10` is documentation-only and must not intentionally change runtime behavior
- `dev.11` may move logic without changing user-visible behavior
- `dev.12` introduces the first `node:test` unit coverage and may add test-only files and npm scripts without changing production runtime behavior
- `dev.14` may add narrow dependency-injection seams when required to test existing runtime wiring without changing user-visible behavior
- `dev.15` may add Playwright config, smoke-only test files, and dev-only dependencies while keeping the production runtime unchanged
- `dev.16` and later Flathub-facing patches should keep test scaffolding stable unless explicitly required by packaging or CI
- dev.17 includes naming cleanup work, documentation alignment, and the Flatpak app-id identity migration
- dev.18 should focus on permission minimization and explicit rationale updates
- dev.19 should finalize branding/trademark strategy and verify user-data compatibility after the migration
- `dev.20` should finalize submission-manifest validation before release-candidate closure
- `dev.21` should close RC/stable tasks and release documentation
- update the roadmap and changelog when the planned phase sequence changes

## Development branch naming

Development branches must use only the target version number.

Format:

`dev/<version>`

Examples:

- `dev/1.4.10-dev.7`
- `dev/1.4.10-dev.9`
- `dev/1.4.10-dev.5`
- `dev/1.4.10-rc.1`

Rules:

- Use `dev/<version>` for development-cycle branches.
- Do not use `codex/` for development branches.
- Do not append purpose suffixes.
- Development PRs must target `dev`.
- Branches should remain short-lived during active development.
- Branches may be kept until the stable release if the maintainer explicitly wants to preserve development history.
