# Technical Notes

This document centralizes technical repository notes for the `1.4.10-dev.X` packaging cycle.

## Scope

Current `1.4.10-dev.X` goals focus on Flathub readiness, packaging workflow improvements, and security diagnostics:

- keep `canva-linux.sh` as the canonical Linux workflow command;
- support interactive mode, explicit actions, and chained actions for workflow tasks;
- keep AppStream metadata, screenshot references, and packaging docs aligned;
- keep runtime behavior unchanged.

## Runtime architecture (summary)

Core runtime files:

- `electron/main.js` - Electron shell entrypoint, tab model, OAuth popup wiring, persistent session ownership, and credential storage diagnostics.
- `electron/canva-preload.js` - Canva page preload diagnostics and Linux integration bridges.
- `electron/toolbar-preload.js` - toolbar IPC bridge.
- `electron/toolbar.html` - local toolbar UI.

Packaging/runtime support files:

- `run.sh` - Flatpak launcher and Wayland/X11 mode selection.
- `canva-linux.sh` - canonical Linux Flatpak workflow command (`--install`, `--bundle`, `--validate`, `--uninstall`, `--reset-user-data`, and interactive mode).
- `scripts/install-flatpak-local.sh` - local Flatpak build/install for development and testing (supports `--skip-npm`).
- `scripts/build-flatpak-bundle.sh` - on-demand distributable `.flatpak` bundle generation (supports `--rebuild-repo`).
- `scripts/validate-flatpak.sh` - workflow and metadata validation helper.
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

`1.4.10-dev.4` adds a first-pass colorized status prefix for high-value security/status diagnostics in `electron/main.js`.

This pass is intentionally small and is expected to evolve into a more centralized log-level system in future revisions.

No new runtime feature is introduced by this diagnostics change.


## Flathub readiness note

The project is approaching Flathub submission readiness. Final Flathub submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.
