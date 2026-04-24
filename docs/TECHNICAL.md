# Technical Notes

This document centralizes technical repository notes for the `1.4.8-dev.X` maintenance line.

## Scope

Current DEV7 goals are intentionally non-functional:

- prepare final release-closure documentation for `1.4.8-dev.X`;
- preserve existing behavior while documenting release and validation intent;
- maintain version/changelog continuity.

## Runtime architecture (summary)

Core runtime files:

- `electron/main.js` - Electron shell entrypoint, tab model, OAuth popup wiring, persistent session ownership.
- `electron/canva-preload.js` - Canva page preload diagnostics and Linux integration bridges.
- `electron/toolbar-preload.js` - toolbar IPC bridge.
- `electron/toolbar.html` - local toolbar UI.

Packaging/runtime support files:

- `run.sh` - Flatpak launcher and Wayland/X11 mode selection.
- `build-flatpak.sh` - local Flatpak build helper.
- `com.canva.WebApp.yml` - Flatpak manifest.
- `data/com.canva.WebApp.desktop` and `data/com.canva.WebApp.metainfo.xml` - desktop and appstream metadata.

## Repository hygiene

Backup/reject artifacts from local patch attempts must not be kept in tracked sources:

- `*.bak`
- `*.orig`
- `*.rej`

DEV5 removed existing tracked artifacts in those classes and keeps this policy documented for future patch iterations.

## Known limitation kept unchanged

Linux/Wayland OAuth popup icon replacement remains a known limitation in this branch and is not a DEV7 implementation target.


## DEV7 release closure artifacts

This phase adds two documentation artifacts to close the current DEV cycle without runtime changes:

- `docs/RELEASE_CHECKLIST.md` - release readiness checklist for maintainers/reviewers.
- `docs/MANUAL_VALIDATION.md` - manual runtime validation sequence used before promoting the next stage.
