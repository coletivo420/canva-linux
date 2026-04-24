# Flathub Preparation Guide

## Purpose

This document explains how to prepare this project for a future Flathub submission while keeping the GitHub release bundle workflow separate.

## Workflow split (1.4.10-dev.1)

The Flatpak packaging flow is intentionally split:

- `./scripts/install-flatpak-local.sh` for fast local development/testing install.
- `./scripts/build-flatpak-bundle.sh` for explicit release bundle generation.
- `./build-flatpak.sh` as a compatibility wrapper:
  - default and `--install` route to local install;
  - `--bundle` routes to bundle generation.

This keeps local iteration fast while preserving release artifact generation when needed.

## GitHub release bundles vs Flathub submission

- **GitHub releases** use local bundle generation from this repository (`./scripts/build-flatpak-bundle.sh`).
- The generated artifact is `dist/canva-webapp-linux-$VERSION.flatpak`.
- **Flathub submission** is a separate workflow and is reviewed in the `flathub/flathub` repository.

Do not treat local GitHub release bundles as a direct Flathub submission mechanism.

## Current readiness status

Current blockers before Flathub submission:

- final Flathub submission and review in `flathub/flathub`;
- manual OAuth validation beyond Google (Facebook/Meta, Apple, Microsoft).

Additional guidance:

- GitHub `.flatpak` bundle releases and Flathub submission are separate workflows and must stay separate.
- Real screenshots are now staged locally in `assets/screenshots/` and integrated into AppStream metadata with stable direct URLs pinned to a commit SHA.
- Branch URLs must not be used for AppStream screenshots.
- `windowpopup.png` is supporting documentation material and not the primary Flathub screenshot.
- OAuth native provider icons are intentionally unsupported and should not block Flathub unless reviewers explicitly object.

## Recommended local checks

```bash
./scripts/validate-flatpak.sh
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
