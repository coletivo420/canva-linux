# Flathub Preparation Guide

## Purpose

This document explains how to prepare this project for a future Flathub submission while keeping the GitHub release bundle workflow separate.

## Canonical workflow command (1.4.10-dev.6)

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

`1.4.10-dev.6` is a Flathub source/readiness hardening pass and introduces no runtime feature.

## Validation and lint workflow

Run the standard validation command first:

```bash
./canva-linux.sh --validate
```

Then run lint checks directly when Flatpak Builder is available:

```bash
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml
./canva-linux.sh --bundle
flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```

If Flatpak Builder is missing locally, install it with:

```bash
flatpak install flathub org.flatpak.Builder
```

## Permissions and portals

The app relies on Flatpak portals for file access where possible.

The manifest intentionally avoids broad home-directory access and keeps narrower paths such as `xdg-download` for common local export/import workflows.

## GitHub release bundles vs Flathub submission

- **Local install** (`--install`) is for development/testing.
- **Bundle generation** (`--bundle`) creates `dist/canva-webapp-linux-$VERSION.flatpak` for GitHub releases.
- **Flathub submission** is a separate workflow reviewed in `flathub/flathub`.

Do not treat local GitHub release bundles as a direct Flathub submission mechanism.

Source strategy guidance for final Flathub submission lives in `docs/FLATHUB_SOURCE.md`.

## Flathub checklist

See `docs/FLATHUB_CHECKLIST.md` for the practical submission checklist, including:

- AppStream and desktop metadata validation
- `flatpak-builder-lint` checks for manifest and repo
- screenshot URL review
- permission review
- OAuth support notes
- stable release source requirements
- final maintainer manual review before submission

## Submission readiness status

The project is approaching Flathub submission readiness, but final submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.

## OAuth note

Google OAuth was tested during development. Other OAuth providers use the same generalized popup flow, but are community-tested and may require feedback from users.
