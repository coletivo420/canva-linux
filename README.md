# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron and packaged as a Flatpak.

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Status

Stable: 1.4.9  
Next: 1.4.10-dev.4 (credential storage diagnostics and policy cleanup)

## Development (1.4.10-dev.X)

The current development cycle focuses on Flathub readiness and packaging improvements.

Goal: prepare the project for Flathub submission without introducing new runtime features.

No new runtime feature is introduced in `1.4.10-dev.4`.

## OAuth Support

Google OAuth was tested and is considered stable.

Other providers (Facebook/Meta, Apple, Microsoft) are supported via the same popup flow but are not individually validated and should be considered community-tested.

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

The project is being prepared for Flathub submission.

Detailed packaging notes live in:

- `docs/FLATHUB.md`
- `docs/FLATHUB_CHECKLIST.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`

## Documentation

- `CHANGELOG.md` tracks released and development changes.
- `docs/TECHNICAL.md` contains repository technical notes.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted maintenance conventions.
- `docs/PRIVACY.md` explains privacy and telemetry scope for this wrapper project.
- `docs/FLATHUB.md` covers Flathub submission preparation.
- `docs/FLATHUB_CHECKLIST.md` tracks practical Flathub submission checks.
- `docs/SCREENSHOTS.md` documents the screenshot workflow.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak permissions and review notes.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.
