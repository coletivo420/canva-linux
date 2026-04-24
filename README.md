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
  Split Flatpak workflow scripts:
  - local install script
  - bundle generation script
  - validation updates
- 1.4.10-dev.2  
  Flathub checklist and submission preparation
- 1.4.10-dev.3  
  Run and fix `flatpak-builder-lint` and AppStream issues
- 1.4.10-dev.4  
  Document OAuth provider support as community-tested

Goal: prepare the project for Flathub submission without introducing new runtime features.

## OAuth Support

Google OAuth was tested and is considered stable.

Other providers (Facebook/Meta, Apple, Microsoft) are supported via the same popup flow but are not individually validated and should be considered community-tested.

OAuth/authentication flows remain the only exception to the tab-based Canva window policy. Normal Canva content stays inside the main tab system.

## Flatpak Workflow

### Local development/testing install

```bash
./scripts/install-flatpak-local.sh
./scripts/install-flatpak-local.sh --skip-npm
```

This path is optimized for local testing: it builds and installs the app locally without generating a release `.flatpak` bundle.

### Optional release bundle generation

```bash
./scripts/build-flatpak-bundle.sh
./scripts/build-flatpak-bundle.sh --rebuild-repo
```

This generates a distributable artifact at:

`dist/canva-webapp-linux-$VERSION.flatpak`

Bundle generation is intended for GitHub releases. Flathub submission is a separate workflow.

### Compatibility wrapper

```bash
./build-flatpak.sh
./build-flatpak.sh --install
./build-flatpak.sh --bundle
./build-flatpak.sh --skip-npm
```

`build-flatpak.sh` remains available as a compatibility wrapper that routes to the new split scripts, including legacy `--skip-npm` pass-through for local installs.

### Validation helper

```bash
./scripts/validate-flatpak.sh
./scripts/validate-flatpak.sh --release-artifacts
```

The default validation path does not require a bundle artifact. Use `--release-artifacts` to enforce release bundle checks.

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

## Documentation

- `CHANGELOG.md` tracks released and development changes.
- `docs/TECHNICAL.md` contains repository technical notes.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted maintenance conventions.
- `docs/FLATHUB.md` covers Flathub submission preparation.
- `docs/SCREENSHOTS.md` documents the screenshot workflow.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak permissions and review notes.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
