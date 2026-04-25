# Technical Notes

This document centralizes technical repository notes for the `1.4.10-dev.X` packaging cycle.

## Scope

Current `1.4.10-dev.X` goals focus on Flathub readiness, packaging workflow improvements, and security diagnostics:

- keep `canva-linux.sh` as the canonical Linux workflow command;
- support interactive mode, explicit actions, and chained actions for workflow tasks;
- keep AppStream metadata, screenshot references, and packaging docs aligned;
- preserve intended user-facing behavior, while allowing targeted fixes for regressions such as the custom eyedropper preload loading failure.

## Custom colorpicker policy

Canva Linux must keep `ltcodedev/eyedropper` as the canonical custom colorpicker implementation.

- `electron/preload/ltcode-eyedropper.js` is the bundled picker implementation used by Canva Linux.
- `electron/preload/native-eyedropper-wrapper.js` exists to redirect Canva-facing picker calls into that bundled implementation.
- `electron/preload/custom-eyedropper-flow.js` exists to open the bundled picker from a Canva tab snapshot.
- any diagnostics around browser picker APIs or media-capture APIs must support tracing and re-routing only; they are not an alternative colorpicker architecture.
- the bundled eyedropper copy intentionally exposes only the canvas-based path used by Canva Linux; unused image-loading helpers and not-implemented stubs are removed instead of kept as dormant API surface.

## Runtime architecture (summary)

Core runtime files:

- `electron/main/index.js` - Electron shell entrypoint, tab model, OAuth popup wiring, persistent session ownership, and credential storage diagnostics.
- `electron/main/eyedropper-bridge.js` - main-process bridge between the Canva preload eyedropper and BrowserView snapshot capture.
- `electron/main/ipc.js` - centralized main-process IPC routing for preload debug forwarding and toolbar actions.
- `electron/main/lifecycle.js` - startup and shutdown lifecycle wiring for session setup, theme hooks, and shell bootstrap.
- `electron/main/logging.js` - startup/status logging helpers and credential-storage diagnostics.
- `electron/main/oauth.js` - OAuth popup lifecycle helpers and callback tracking.
- `electron/main/runtime.js` - Linux runtime hardening, shared session configuration, and storage flushing.
- `electron/main/shell.js` - top-level window and toolbar shell creation helpers.
- `electron/main/tab-controller.js` - tab creation and orchestration layer that connects shell state, tab events, and shared session wiring.
- `electron/main/tab-events.js` - BrowserView/WebContents event wiring for tab navigation, popups, shortcuts, and shell policy.
- `electron/main/tabs.js` - tab ordering, selection, closing, and layout helpers shared by the shell entrypoint.
- `electron/preload/canva.js` - source Canva page preload diagnostics and Linux integration bridges.
- `electron/preload/canva.bundle.js` - generated runtime preload consumed by Canva tabs; do not edit directly.
- `electron/preload/browser-capture-diagnostics.js` - compatibility fallback module for capture-related eyedropper diagnostics.
- `electron/preload/debug.js` - centralized preload debug routing and eyedropper log transport for Canva-facing modules.
- `electron/preload/custom-eyedropper-flow.js` - snapshot capture and bundled `ltcodedev/eyedropper` lifecycle used by the Canva EyeDropper wrapper.
- `electron/preload/eyedropper-routing-diagnostics.js` - diagnostic hooks for tracing and preventing fallback into native/browser picker paths.
- `electron/preload/ltcode-eyedropper.js` - bundled browser-side `ltcodedev/eyedropper` implementation and scaling patch used by the Canva preload wrapper.
- `electron/preload/native-eyedropper-wrapper.js` - native EyeDropper replacement layer that redirects Canva calls into the bundled `ltcodedev/eyedropper` flow.
- `electron/preload/upload-diagnostics.js` - drag, paste, file-input, and file-picker diagnostics isolated from the Canva-specific preload flow.
- `electron/preload/toolbar.js` - toolbar IPC bridge.
- `electron/ui/toolbar.html` - local toolbar UI.
- `electron/shared/debug.js` - shared debug category parsing and log gating for main/preload entrypoints.
- `electron/shared/navigation.js` - shared Canva/OAuth URL classification and trusted-origin checks.

## Main-process structure

The current main-process split is now the working repository structure:

- `electron/main/index.js` remains the orchestration layer.
- `electron/main/runtime.js` owns Linux/runtime and shared session setup.
- `electron/main/lifecycle.js` owns app startup/shutdown wiring.
- `electron/main/ipc.js` owns main-process IPC handlers.
- `electron/main/logging.js` owns status output and startup diagnostics.
- `electron/main/oauth.js` owns popup lifecycle and OAuth callback tracking.
- `electron/main/tab-controller.js` owns tab creation and composes `tab-events.js` with the lower-level tab helpers.
- `electron/main/tab-events.js` owns per-tab `webContents` policy and event wiring.
- `electron/main/tabs.js` owns tab-state helpers and tab shell behavior.
- `electron/main/shell.js` owns top-level shell window and toolbar creation.
- `electron/main/eyedropper-bridge.js` owns the snapshot/log bridge used by the custom eyedropper preload flow.

This split preserves runtime behavior while making future changes safer. `electron/main/index.js` is now primarily a composition root, while the preload delegates debug transport, upload diagnostics, native EyeDropper wrapping, and the bundled `ltcodedev/eyedropper` flow into dedicated modules.

## Preload bundle architecture

The source preload remains modular:

- `electron/preload/canva.js` is the source entrypoint.
- `electron/preload/debug.js`, `upload-diagnostics.js`, `browser-capture-diagnostics.js`, `eyedropper-routing-diagnostics.js`, `custom-eyedropper-flow.js`, `native-eyedropper-wrapper.js`, and `ltcode-eyedropper.js` remain human-maintained modules.
- `scripts/build-preload-bundle.js` generates `electron/preload/canva.bundle.js`.

Canva tabs load `canva.bundle.js`, not `canva.js`, at runtime.

This is intentional. The Canva editor can run Electron preload code in a packaged/sandboxed context where nested local `require('./module')` calls fail after ASAR packaging. When that happened, the editor preload started but failed before `modules-loaded`, so the custom eyedropper wrapper was never installed and Canva fell back toward Chromium/portal capture behavior.

The bundle keeps the maintainable modular source layout while giving Electron a single preload file that works consistently in the editor. Do not edit `canva.bundle.js` directly; regenerate it with `npm run build:preload`.

`npm start` and `npm run dist` regenerate the bundle automatically through npm lifecycle scripts. The canonical install workflow (`./canva-linux.sh --install`) calls `npm run dist`, so it also generates the bundle before packaging. Bundle publication must use a freshly rebuilt Electron output and Flatpak repo; `./canva-linux.sh --bundle` rebuilds both by default. Reusing an existing `repo/` requires the lower-level `scripts/build-flatpak-bundle.sh --use-existing-repo` path and should not be used for release publication after source changes.

## Runtime guardrails

- External navigation is allowed to leave the app only for explicitly supported URL schemes: `https:`, `http:`, and `mailto:`.
- Other schemes are blocked before reaching Electron's system opener.
- The eyedropper snapshot IPC bridge only captures the tab whose renderer sent the request; it does not fall back to the currently active tab.
- Aborting the custom eyedropper flow must remove the overlay and clear the active picker state.

## Debug output

Terminal debug output is now centralized in `electron/main/logging.js`.

- Main-process debug entries are emitted with the source prefix `main`.
- Preload entries are forwarded over IPC and rendered with source prefixes such as `canva-preload` and `toolbar-preload`.
- A fresh `current.log` file is created on each app start under the Electron user-data logs directory, replacing the previous startup log.
- New instrumentation should use the shared debug helpers instead of adding direct `console.log` calls so terminal output stays consistent, deduplicated, and mirrored into the startup log file.

Packaging/runtime support files:

- `run.sh` - Flatpak launcher and Wayland/X11 mode selection.
- `canva-linux.sh` - canonical Linux Flatpak workflow command (`--install`, `--bundle`, `--validate`, `--uninstall`, `--reset-user-data`, and interactive mode).
- `scripts/flatpak-build-common.sh` - shared Flatpak runtime, Electron output, and repository build helpers used by local install and bundle workflows.
- `scripts/install-flatpak-local.sh` - local Flatpak build/install for development and testing (supports `--skip-npm`).
- `scripts/build-flatpak-bundle.sh` - on-demand distributable `.flatpak` bundle generation (rebuilds by default; supports explicit `--use-existing-repo` for non-release reuse).
- `scripts/validate-flatpak.sh` - workflow and metadata validation helper.
- `scripts/build-preload-bundle.js` - dependency-free generated-preload builder used before local start and Electron packaging.
- `com.canva.WebApp.yml` - Flatpak manifest.
- `docs/PRIVACY.md` - repository privacy and telemetry policy statement.
- `docs/FLATHUB_SOURCE.md` - Flathub source strategy notes for the current local manifest and future source-based submission.
- `data/com.canva.WebApp.desktop` and `data/com.canva.WebApp.metainfo.xml` - desktop and appstream metadata.

## Workflow notes

- Local install is for development/testing.
- Bundle generation is for GitHub release artifacts.
- Flathub submission and review are separate from bundle publication.
- Final Flathub source selection and reviewed source URLs/hashes are documented in `docs/FLATHUB_SOURCE.md`.
- Resetting user data removes login state and OAuth/session cookies.

## Window and tab policy

Canva navigation is handled by the internal tab system. The app should not open arbitrary Electron windows for normal Canva content.

Separate Electron windows are reserved for OAuth/authentication popups only.

## OAuth provider scope

Google OAuth was tested during development. Facebook/Meta, Apple, and Microsoft are community-tested only.

OAuth popup logic remains provider-neutral, and native OAuth provider icons remain intentionally unsupported.

## Login persistence

The app stores Canva login state in Electron's persistent session partition:

`persist:canva`

Main Canva tabs and OAuth popup windows use the same partition, so OAuth cookies, Canva cookies, and site storage survive app restarts.

## Known limitation kept unchanged

OAuth popup native provider icons remain a known Linux/Wayland limitation for this branch. The popup flow should stay stable without provider-specific native icon customization.

## Security diagnostics note

`1.4.10-dev.8` adds the preload bundle step required by the current modular runtime.

The current logger writes both terminal output and a per-start `current.log` file for troubleshooting.

This is a maintainability and diagnostics improvement, not a user-facing feature addition.


## Flathub readiness note

The project is approaching Flathub submission readiness. Final Flathub submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.
