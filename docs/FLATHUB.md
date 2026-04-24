# Flathub Preparation Guide

## Purpose

This document explains how to prepare this project for a future Flathub submission while keeping the GitHub release bundle workflow separate.

## Canonical workflow command (1.4.10-dev.4)

Use `./canva-linux.sh` as the canonical Linux/Flatpak workflow command.

```bash
./canva-linux.sh --install
./canva-linux.sh --bundle
./canva-linux.sh --validate
./canva-linux.sh --uninstall
./canva-linux.sh --reset-user-data
./canva-linux.sh --help
```

Notes:

- No arguments open an interactive workflow menu.
- Actions can be chained and run in argument order.
- `--uninstall` can only be combined with `--reset-user-data`.

`1.4.10-dev.4` introduces no new runtime feature. This cycle keeps packaging/runtime behavior stable while improving internal diagnostics and documentation.


## Permissions and portals

The app relies on Flatpak portals for file access when possible.

The manifest intentionally avoids broad home-directory access and keeps `xdg-download` for common local export/import workflows.

## GitHub release bundles vs Flathub submission

- **Local install** (`--install`) is for development/testing.
- **Bundle generation** (`--bundle`) creates `dist/canva-webapp-linux-$VERSION.flatpak` for GitHub releases.
- **Flathub submission** is a separate workflow reviewed in `flathub/flathub`.

Do not treat local GitHub release bundles as a direct Flathub submission mechanism.

## Flathub checklist

See `docs/FLATHUB_CHECKLIST.md` for the practical submission checklist, including:

- AppStream and desktop metadata validation
- `flatpak-builder-lint` checks
- screenshot URL review
- permission review
- OAuth support notes
- stable release source requirements
- final maintainer manual review before submission

## Recommended local checks

```bash
./canva-linux.sh --validate
./scripts/validate-flatpak.sh --release-artifacts
appstreamcli validate --explain data/com.canva.WebApp.metainfo.xml
desktop-file-validate data/com.canva.WebApp.desktop
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```

## References

- Flathub submission docs: <https://docs.flathub.org/docs/for-app-authors/submission/>
- Flathub requirements: <https://docs.flathub.org/docs/for-app-authors/requirements/>
- Flathub metainfo guidelines: <https://docs.flathub.org/docs/for-app-authors/metainfo-guidelines/>
- Flathub builder lint docs: <https://docs.flathub.org/docs/for-app-authors/linter/>

- Project privacy/telemetry note: `docs/PRIVACY.md`
