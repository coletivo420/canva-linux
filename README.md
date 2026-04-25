# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron and packaged as a Flatpak.

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Status

Stable: 1.4.9  
Next: 1.4.10-dev.16 (phase 6 Flathub follow-up hardening)

## Development (1.4.10-dev.X)

The current development cycle focuses on Flathub readiness, packaging improvements, runtime maintainability, and a phased testing architecture for future hardening work.

Goal: prepare the project for Flathub submission while introducing small, reviewable development phases for documentation, extraction, testing, and Electron smoke coverage.

`1.4.10-dev.10` starts the documentation and AI/vibecoding preparation phase for the testing cycle. This phase aligns the repository docs, changelog, and roadmap before code extraction or test harness changes land.

`1.4.10-dev.11` extracts the main-process window-open policy from `electron/main/index.js` into a dedicated module so the policy can be tested in isolation before `node:test`, wiring, and Playwright phases land.

`1.4.10-dev.12` adds the first `node:test` unit coverage for the extracted window-open policy, keeping production runtime behavior unchanged while establishing the test harness for the later wiring and Playwright phases.

`1.4.10-dev.14` adds a lightweight main-process wiring test that verifies the tab controller passes the expected navigation helpers into the tab event layer without changing user-visible behavior.

`1.4.10-dev.15` added a minimal Playwright smoke test that launches the Electron app in development mode, confirms it is not packaged, and waits for the first BrowserWindow so the project gains real process-level launch coverage without introducing a broad E2E suite.

`1.4.10-dev.16` focuses on Flathub follow-up hardening and packaging resilience after the testing foundation landed.

Planned phase map:

- `1.4.10-dev.10` - documentation, AI/vibecoding preparation, and roadmap alignment
- `1.4.10-dev.11` - extraction of the window-open policy into a testable module
- `1.4.10-dev.12` - unit tests with `node:test`
- `1.4.10-dev.14` - light wiring/integration tests for the main-process tab flow
- `1.4.10-dev.15` - Electron smoke test coverage with Playwright
- `1.4.10-dev.16` - Flathub-facing follow-up adjustments after the testing foundation is in place

`1.4.10-dev.8` keeps the modular source layout, but ships the Canva preload as a generated single-file bundle so Electron's sandboxed editor preload can load the custom eyedropper reliably.

`1.4.10-dev.7` introduced a major internal refactor:

- modularized `electron/main` and `electron/preload`
- centralized debug logging in the main process
- per-start `current.log` creation under the Electron user-data logs directory

## Custom Colorpicker Policy

Canva Linux must always use the bundled custom colorpicker based on `ltcodedev/eyedropper`:

https://github.com/ltcodedev/eyedropper

Project policy:

- the Canva color picking flow must resolve into the bundled `ltcodedev/eyedropper` implementation
- native browser/system color pickers are not the intended Canva Linux colorpicker path
- screen-capture, portal, or Chromium picker paths must not replace the bundled custom picker as the primary behavior
- Wayland and X11 support must preserve the same custom picker behavior

### Preload bundle note

The source preload stays modular under `electron/preload/*.js`, but the runtime tab preload is generated as `electron/preload/canva.bundle.js` before `npm start`, `npm run dist`, and any Flatpak workflow path that rebuilds the Electron output.

This is required because Canva's editor can execute Electron preload code in a sandboxed context where nested local `require('./module')` calls fail inside the packaged ASAR. The generated bundle preserves maintainable source modules while delivering one preload file to Electron. Edit the modular source files and regenerate the bundle; do not edit or commit `canva.bundle.js` directly.

Release bundle generation rebuilds the Electron output and Flatpak repo by default so the generated preload bundle and packaged app stay current. Reusing an existing `repo/` requires an explicit `--use-existing-repo` call to `scripts/build-flatpak-bundle.sh` and should not be used for release publication after source changes.

## OAuth Support

Google OAuth was tested and is considered stable.

Other providers (Facebook/Meta, Apple, Microsoft) are supported via the same generalized popup flow but are community-tested and may require user feedback.

## Flatpak Workflow (Canonical Command)

Use `./canva-linux.sh` as the canonical Linux workflow command.

```bash
./canva-linux.sh --install
./canva-linux.sh --bundle
./canva-linux.sh --validate
./canva-linux.sh --uninstall
./canva-linux.sh --reset-user-data
./canva-linux.sh --help
```

### Interactive mode

Running without arguments opens an interactive menu:

```bash
./canva-linux.sh
```

### Chained actions

Actions can be chained and run in the order provided:

```bash
./canva-linux.sh --install --bundle
./canva-linux.sh --bundle --install
./canva-linux.sh --validate --bundle
./canva-linux.sh --reset-user-data --install
./canva-linux.sh --uninstall --reset-user-data
```

### Workflow intent

- `--install` is for local development/testing installs.
- `--install` uses `flatpak-builder --install` direct install flow (no `repo/` export and no `.flatpak` bundle generation).
- `--bundle` is for generating GitHub release `.flatpak` artifacts.
- `--bundle` rebuilds the Electron output and Flatpak repo before creating the artifact.
- Flathub submission remains a separate process and should not require `.flatpak` bundle generation.
- Submission-specific assets live in `packaging/flathub/`; local workflows continue to use `com.canva.WebApp.yml`.
- `--reset-user-data` removes login state and OAuth/session cookies.

## Flathub Status

The project is approaching Flathub submission readiness, but final submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.

Detailed packaging notes live in:

- `docs/FLATHUB.md`
- `docs/FLATHUB_CHECKLIST.md`
- `docs/FLATHUB_SOURCE.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/FLATHUB_SUBMISSION_PATH.md`
- `docs/FLATHUB_SUBMISSION_NOTES.md`
- `packaging/flathub/`

## Documentation

- `CHANGELOG.md` tracks released and development changes.
- `docs/TECHNICAL.md` contains repository technical notes.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted maintenance conventions.
- `docs/PRIVACY.md` explains privacy and telemetry scope for this wrapper project.
- `docs/FLATHUB.md` covers Flathub submission preparation.
- `docs/FLATHUB_CHECKLIST.md` tracks practical Flathub submission checks.
- `docs/FLATHUB_SOURCE.md` documents the current local manifest source workflow and future Flathub source expectations.
- `docs/SCREENSHOTS.md` documents the screenshot workflow.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak permissions and review notes.
- `docs/FLATHUB_SUBMISSION_PATH.md` documents the dedicated submission-path workflow and validation commands.
- `docs/FLATHUB_SUBMISSION_NOTES.md` captures submission rationale, including the response to thin-wrapper objections.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
