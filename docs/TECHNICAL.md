# Technical Notes

This document centralizes technical repository notes for the `1.4.10-dev.X` packaging cycle.

## Scope

Current `1.4.10-dev.X` goals focus on Flathub readiness and packaging workflow improvements:

- split local Flatpak install and release bundle generation workflows;
- preserve compatibility via `build-flatpak.sh` wrapper routing;
- keep AppStream metadata, screenshot references, and packaging docs aligned;
- keep runtime behavior unchanged.

## Runtime architecture (summary)

Core runtime files:

- `electron/main.js` - Electron shell entrypoint, tab model, OAuth popup wiring, and persistent session ownership.
- `electron/canva-preload.js` - Canva page preload diagnostics and Linux integration bridges.
- `electron/toolbar-preload.js` - toolbar IPC bridge.
- `electron/toolbar.html` - local toolbar UI.

Packaging/runtime support files:

- `run.sh` - Flatpak launcher and Wayland/X11 mode selection.
- `scripts/install-flatpak-local.sh` - local Flatpak build/install for development and testing (supports `--skip-npm`).
- `scripts/build-flatpak-bundle.sh` - on-demand distributable `.flatpak` bundle generation (supports `--rebuild-repo`).
- `build-flatpak.sh` - compatibility wrapper for install and bundle workflows, including legacy `--skip-npm` pass-through.
- `scripts/validate-flatpak.sh` - workflow and metadata validation helper.
- `com.canva.WebApp.yml` - Flatpak manifest.
- `data/com.canva.WebApp.desktop` and `data/com.canva.WebApp.metainfo.xml` - desktop and appstream metadata.

## Window and tab policy

Canva navigation is handled by the internal tab system. The app should not open arbitrary Electron windows for normal Canva content.

Separate Electron windows are reserved for OAuth/authentication popups only.

## OAuth provider scope

Google OAuth was tested during this cycle. Facebook/Meta, Apple, and Microsoft are community-tested only.

OAuth popup logic remains provider-neutral, and native OAuth provider icons remain intentionally unsupported.

## Login persistence

The app stores Canva login state in Electron's persistent session partition:

`persist:canva`

Main Canva tabs and OAuth popup windows use the same partition, so OAuth cookies, Canva cookies, and site storage survive app restarts.

## Known limitation kept unchanged

OAuth popup native provider icons remain a known Linux/Wayland limitation for this branch. The popup flow should stay stable without provider-specific native icon customization.
