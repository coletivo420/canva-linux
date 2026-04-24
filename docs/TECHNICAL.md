# Technical Notes

This document centralizes technical repository notes for the `1.4.9-dev.X` maintenance line.

## Scope

Current `1.4.9-dev.14` goals focus on final Flathub and release-readiness validation before `1.4.9-rc.1`:

- preserve the existing shell architecture and OAuth popup detection rules;
- keep AppStream metadata, screenshot references, and packaging docs aligned;
- document window/tab policy and persistent login behavior clearly;
- keep changes small, reviewable, and aligned with `CHANGELOG.md`.

## Runtime architecture (summary)

Core runtime files:

- `electron/main.js` - Electron shell entrypoint, tab model, OAuth popup wiring, and persistent session ownership.
- `electron/canva-preload.js` - Canva page preload diagnostics and Linux integration bridges.
- `electron/toolbar-preload.js` - toolbar IPC bridge.
- `electron/toolbar.html` - local toolbar UI.

Packaging/runtime support files:

- `run.sh` - Flatpak launcher and Wayland/X11 mode selection.
- `build-flatpak.sh` - local Flatpak build helper.
- `com.canva.WebApp.yml` - Flatpak manifest.
- `data/com.canva.WebApp.desktop` and `data/com.canva.WebApp.metainfo.xml` - desktop and appstream metadata.

## Window and tab policy

Canva navigation is handled by the internal tab system. The app should not open arbitrary Electron windows for normal Canva content.

Separate Electron windows are reserved for OAuth/authentication popups only. This keeps the main Canva workflow organized in tabs while preserving provider login flows that require popup-style windows.

## Login persistence

The app stores Canva login state in Electron's persistent session partition:

`persist:canva`

Main Canva tabs and OAuth popup windows use the same partition, so OAuth cookies, Canva cookies, and site storage survive app restarts. This shared persistent session is what keeps the user logged in.

Do not replace this with a temporary session or an isolated OAuth-only partition unless the login flow is redesigned and fully retested.

Operational notes:

- OAuth popups must not use a temporary/session-only partition.
- Clean-session testing can require removing local Flatpak app data.
- Session flushing is used before quit and after OAuth completion to persist cookies/storage data.

## OAuth popup policy

Canva content stays inside the app tab system. Separate Electron windows are reserved only for OAuth/authentication flows.

OAuth popups must use the same persistent `persist:canva` session as the main Canva tabs. This allows provider cookies, Canva cookies, and site storage to survive the OAuth flow and app restarts.

OAuth provider-specific native icons are intentionally unsupported. Favicon updates must not change native popup icons or affect popup behavior.

OAuth popup logic is provider-neutral across Google, Facebook/Meta, Apple, Microsoft, and Canva OAuth callbacks. The same popup/session/callback behavior applies to all supported providers, and provider icons/favicons are intentionally not used for native window behavior.

Provider coverage note for this cycle: Google was the provider tested during this development cycle. OAuth handling was generalized for other common Canva providers, but Facebook/Meta, Apple, and Microsoft still require manual testing and may expose provider-specific issues.

## AppStream screenshot policy

Real screenshots live in `assets/screenshots/` and are tracked for release readiness in `assets/screenshots/MANIFEST.md`.

The active AppStream screenshot list uses:

- `home.png` as the default screenshot;
- `tabs.png`, `upload.png`, and `eyedropper.png` as the additional AppStream screenshots.

`windowpopup.png` remains supporting documentation material and is not the primary Flathub screenshot. `editor.png` is intentionally not required.

Stable direct screenshot URLs must stay pinned to a commit SHA or stable release/tag. Do not use branch URLs in AppStream metadata.

## Repository hygiene

Backup/reject artifacts from local patch attempts must not be kept in tracked sources:

- `*.bak`
- `*.orig`
- `*.rej`

## Known limitation kept unchanged

OAuth popup native provider icons remain a known Linux/Wayland limitation for this branch. The popup flow should stay stable without provider-specific native icon customization.
