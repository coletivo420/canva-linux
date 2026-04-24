# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron/Chromium and packaged with the Flatpak Freedesktop runtime.

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Project goal

The goal of this project is to provide a practical Canva desktop workflow on Linux while staying close to the behavior users expect from a native desktop app.

The current development line focuses on:

- persistent Canva sessions;
- internal tab handling for Canva pages;
- a fixed Home tab that always remains available;
- OAuth popups that share the same persistent session;
- file access from the user home directory through Flatpak permissions;
- Wayland-first startup with an X11 fallback and manual overrides;
- a custom eyedropper implementation that works in current Linux testing;
- readable diagnostics for startup, tabs, OAuth, uploads, permissions, sessions, drag-and-drop, and eyedropper flows.

Feature parity with the official Canva desktop experience remains a long-term goal, but the current `1.4.9-dev.X` branch is primarily a distribution, Flathub preparation, and AI-assisted maintenance branch.

## Current development status

Current development version: `1.4.9-dev.10`.

Stable baseline: `1.4.8`.

The `dev` branch currently keeps the stable `1.4.8` foundation and adds the `1.4.9-dev.X` distribution, Flathub preparation, and AI-assisted maintenance documentation.

The native Linux/Wayland OAuth popup icon experiment is **not an active target** for the current `1.4.9-dev.X` phase. It is documented as a known limitation and should not block current maintenance work.

## Documentation map

- `README.md` provides project orientation and day-to-day development context.
- `CHANGELOG.md` is the authoritative timeline for each dev delivery and must be updated in every development patch.
- `docs/TECHNICAL.md` centralizes technical repository notes for the current maintenance branch.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted development and vibecoding conventions for maintainers.
- `docs/RELEASE_CHECKLIST.md` provides the release-candidate validation checklist before final `1.4.8`.
- `docs/MANUAL_VALIDATION.md` defines the manual validation routine for non-functional patch closure.
- `docs/FLATHUB.md` documents Flathub submission preparation as a separate workflow from GitHub release bundles.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak manifest permissions and future minimization guidance.

## Architecture overview

The application is split into a small Electron shell, preload scripts, Flatpak packaging files, and desktop integration metadata.

Main runtime pieces:

- `electron/main.js` starts the Electron app, creates the main window, owns the persistent session, manages tabs, creates OAuth popups, applies permission handling, and receives debug messages from preload scripts.
- `electron/canva-preload.js` runs inside Canva pages and provides Linux-specific instrumentation for drag-and-drop, uploads, clipboard ingress, file picker events, and the custom eyedropper bridge.
- `electron/toolbar-preload.js` exposes the toolbar IPC bridge used by the local toolbar UI.
- `electron/toolbar.html` renders the wrapper toolbar and tab controls.
- `run.sh` launches the app inside Flatpak and selects Wayland, X11, or automatic platform behavior based on environment variables.
- `build-flatpak.sh` builds and installs the local Flatpak package for testing and also exports a versioned bundle to `dist/`.
- `com.canva.WebApp.yml` defines the Flatpak build, runtime, permissions, finish args, and packaging modules.
- `data/com.canva.WebApp.desktop` and `data/com.canva.WebApp.metainfo.xml` provide desktop and software-center metadata.

## Window and tab policy

Canva navigation is handled by the internal tab system. The app should not open arbitrary Electron windows for normal Canva content.

Separate Electron windows are reserved for OAuth/authentication popups only. This keeps the main Canva workflow organized in tabs while preserving provider login flows that require popup-style windows.

## Shell behavior

- The main shell uses Electron `WebContentsView` instead of deprecated `BrowserView` APIs.
- The **Home** tab is fixed and cannot be closed.
- The **Home** button focuses the existing Home tab instead of creating a duplicate tab.
- Normal Canva pages open in internal tabs.
- Compatible OAuth providers open in separate popup windows.
- OAuth popups share the same persistent session partition used by the main Canva shell.
- Startup debug logs summarize the current development state and highlight flows that still need validation.

## Persistent session model

The wrapper uses a persistent Electron partition for Canva browsing data. This keeps login state, cookies, and OAuth continuity across app restarts.

Important session expectations:

- the main Canva views and OAuth popups must share the same persistent partition;
- clean-session OAuth tests should be done after clearing local Flatpak app data;
- permission handling should preserve normal Canva workflows while staying compatible with the Flatpak sandbox;
- upload, picker, clipboard, and OAuth behavior may differ between native Wayland, XWayland, X11, and different desktop environments.

## Debug categories

`CANVA_DEBUG=1` enables full wrapper debug output.

You can also filter debug output by category:

```bash
CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp
```

Available categories:

- `startup` - launcher, runtime, and development status summaries;
- `app` - general application lifecycle diagnostics;
- `tabs` - tab creation, activation, closing, and toolbar state;
- `view` - `WebContentsView` attachment, layout, and visibility behavior;
- `oauth` - OAuth popup creation, navigation, lifecycle, and completion diagnostics;
- `dnd` - drag-and-drop instrumentation;
- `upload` - file picker, clipboard, `FormData`, `fetch`, `XMLHttpRequest`, and `sendBeacon` upload correlation;
- `permissions` - Electron and Chromium permission requests;
- `session` - persistent session and partition diagnostics;
- `eyedropper` - custom eyedropper bridge diagnostics.

The legacy alias `drag` is still accepted and maps to `dnd`.

For Wayland drag, picker, upload, and clipboard troubleshooting, start with:

```bash
CANVA_DEBUG=startup,dnd,upload,permissions,session,oauth flatpak run com.canva.WebApp
```

## Wayland and X11 behavior

The launcher prefers native Wayland when a Wayland session is detected. X11 remains available automatically for non-Wayland sessions and manually for troubleshooting.

Useful commands:

```bash
flatpak run com.canva.WebApp
CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp
CANVA_FORCE_X11=1 flatpak run com.canva.WebApp
CANVA_DEBUG=startup flatpak run com.canva.WebApp
```

Wayland is the preferred path for modern Linux desktops, but some drag-and-drop, file picker, GPU, compositor, or Chromium behaviors may still vary by distribution, desktop environment, GPU driver, and sandbox state.

## Known limitations and current observations

- Native OAuth popup window icons on Linux/Wayland are a known limitation for now. Recent attempts to force provider-specific native popup icons did not work reliably in practice and are not a DEV7 target.
- Clean-session OAuth completion still needs targeted retesting after removing local Flatpak app data.
- Host file picker continuation and clipboard-driven imports should continue to be tested with the richer `upload` diagnostics added in the `1.4.8-dev.X` line.
- Native Wayland drag-and-drop can still depend on compositor and Chromium behavior.
- GPU, VAAPI, and sandbox warnings may appear depending on host drivers and runtime support.
- Repository cleanup completed in DEV5; keep enforcing the no-backup-artifacts policy for future patches.

## Development flow

The current maintenance model uses a stable baseline plus development iterations:

- stable releases use plain version numbers such as `1.4.7`;
- development releases use suffixes such as `1.4.8-dev.1`, `1.4.8-dev.2`, `1.4.8-dev.4`, `1.4.8-dev.5`, `1.4.8-dev.6`, and `1.4.8-dev.7`;
- the current development delivery is `1.4.9-dev.10`;
- every development patch must update `CHANGELOG.md`;
- documentation, code comments, and project files should remain in English;
- patches should stay small, reviewable, and easy to revert;
- functional changes should be proposed only after the documentation and project state are clear.

The DEV7 phase should focus on release closure documentation and validation guidance:

1. close out `1.4.8-dev.X` with a release checklist and manual validation guide;
2. keep `README.md`, `docs/TECHNICAL.md`, and `CHANGELOG.md` aligned to the current DEV version;
3. preserve non-functional patch scope and avoid behavior changes;
4. keep repository hygiene policy enforced (`*.bak`, `*.orig`, `*.rej` remain untracked);
5. defer any functional fixes to a separate development patch.


## Flathub preparation status

Flathub readiness is in progress and tracked in:

- `docs/FLATHUB.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`

GitHub `.flatpak` release bundles and Flathub submission remain separate workflows.

## Distribution workflows

- Local `.flatpak` bundles are generated for GitHub releases at `dist/canva-webapp-linux-$VERSION.flatpak`.
- Flathub submission preparation is documented separately in `docs/FLATHUB.md`.

## Build

```bash
chmod +x build-flatpak.sh
./build-flatpak.sh
```

The build helper also generates a versioned Flatpak bundle artifact at:

```
dist/canva-webapp-linux-$VERSION.flatpak
```

## Run and post-install commands

```bash
flatpak run com.canva.WebApp
CANVA_DEBUG=1 flatpak run com.canva.WebApp
CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp
CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp
CANVA_FORCE_X11=1 flatpak run com.canva.WebApp
flatpak uninstall --user com.canva.WebApp
```

## References

Official documentation and reference projects used for architecture and packaging decisions:

- Flatpak introduction: https://docs.flatpak.org/en/latest/introduction.html
- Flatpak Electron guide: https://docs.flatpak.org/en/latest/electron.html
- Flatpak sandbox permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak builder reference: https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html
- Electron official documentation: https://www.electronjs.org/docs/latest/
- Electron `WebContentsView`: https://www.electronjs.org/docs/latest/api/web-contents-view
- Electron sessions: https://www.electronjs.org/docs/latest/api/session
- Electron permissions: https://www.electronjs.org/docs/latest/api/session#sessetpermissionrequesthandlerhandler
- Canva Developers portal: https://www.canva.dev/docs/apps/
- Canva Connect authentication: https://www.canva.dev/docs/connect/authentication/
- Original Linux wrapper project: https://github.com/V8V88V8V88/canva-linux
- ltcode/eyedropper reference project: https://github.com/ltcodedev/eyedropper

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
