# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron and packaged as a Flatpak.

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Status

Stable: 1.4.9  
Next: 1.4.10 (Flathub readiness and packaging improvements)

## Development (1.4.10-dev.X)

The current development cycle focuses on Flathub readiness and packaging improvements.

Planned milestones:

- 1.4.10-dev.1  
  Split Flatpak scripts:
  - local install script
  - bundle generation script
  - validation script
- 1.4.10-dev.2  
  Flathub checklist and submission preparation
- 1.4.10-dev.3  
  Run and fix `flatpak-builder-lint` and AppStream issues
- 1.4.10-dev.4  
  Document OAuth provider support as community-tested

Goal:
Prepare the project for Flathub submission without introducing new runtime features.

## OAuth Support

Google OAuth was tested and is considered stable.

Other providers (Facebook/Meta, Apple, Microsoft) are supported via the same popup flow but are not individually validated and should be considered community-tested.

OAuth/authentication flows remain the only exception to the tab-based Canva window policy. Normal Canva content stays inside the main tab system.

## Flathub Status

The project is being prepared for Flathub submission.

- AppStream metadata implemented
- Screenshots prepared
- Flatpak manifest functional
- Final linting and submission pending

Detailed packaging notes live in:

- `docs/FLATHUB.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`

## Build and Run

```bash
./build-flatpak.sh
flatpak run com.canva.WebApp
CANVA_DEBUG=1 flatpak run com.canva.WebApp
CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp
CANVA_FORCE_X11=1 flatpak run com.canva.WebApp
```

Release bundles are generated at `dist/canva-webapp-linux-$VERSION.flatpak`.

## Documentation

- `CHANGELOG.md` tracks released and development changes.
- `docs/TECHNICAL.md` contains repository technical notes.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted maintenance conventions.
- `docs/FLATHUB.md` covers Flathub submission preparation.
- `docs/SCREENSHOTS.md` documents the screenshot workflow.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak permissions and review notes.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
