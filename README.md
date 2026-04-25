# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron and packaged as a Flatpak.

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Status

Stable: 1.4.9  
Next: 1.4.10-dev.8 (preload bundle and custom eyedropper regression fix)

## Development (1.4.10-dev.X)

The current development cycle focuses on Flathub readiness, packaging improvements, and runtime maintainability.

Goal: prepare the project for Flathub submission without introducing new runtime features.

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

The source preload stays modular under `electron/preload/*.js`, but the runtime tab preload is generated as `electron/preload/canva.bundle.js` before `npm start` and `npm run dist`.

This is required because Canva's editor can execute Electron preload code in a sandboxed context where nested local `require('./module')` calls fail inside the packaged ASAR. The generated bundle preserves maintainable source modules while delivering one preload file to Electron.

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
- `--bundle` is for generating GitHub release `.flatpak` artifacts.
- Flathub submission remains a separate process.
- `--reset-user-data` removes login state and OAuth/session cookies.

## Flathub Status

The project is approaching Flathub submission readiness, but final submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.

Detailed packaging notes live in:

- `docs/FLATHUB.md`
- `docs/FLATHUB_CHECKLIST.md`
- `docs/FLATHUB_SOURCE.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`

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

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
