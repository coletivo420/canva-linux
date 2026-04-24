# Flathub Preparation Guide

## Purpose

This document explains how to prepare this project for a future Flathub submission while keeping the existing GitHub release bundle workflow separate.

## GitHub release bundles vs Flathub submission

- **GitHub releases** use local bundle generation from this repository.
- The generated artifact is `dist/canva-webapp-linux-$VERSION.flatpak`.
- **Flathub submission** is a separate workflow and is reviewed in the `flathub/flathub` repository.

Do not treat local GitHub release bundles as a direct Flathub submission mechanism.

## Current readiness status

Current blockers before Flathub submission:

- real public screenshots suitable for AppStream metadata;
- manual OAuth validation beyond Google (Facebook/Meta, Apple, Microsoft).

Additional guidance:

- GitHub `.flatpak` bundle releases and Flathub submission are separate workflows and must stay separate.
- OAuth native provider icons are intentionally unsupported and should not block Flathub unless reviewers explicitly object.

## Flathub submission expectations

A future Flathub submission generally requires:

- a valid Flatpak manifest;
- valid AppStream metadata (`.metainfo.xml`);
- a valid desktop entry (`.desktop`);
- aligned icon assets;
- real screenshots in AppStream metadata for graphical apps;
- a permission review with clear justification (tracked in `docs/FLATPAK_PERMISSIONS.md`);
- a pull request to `flathub/flathub`.

Flathub maintainers review submissions case-by-case and can reject apps depending on policy fit and packaging quality.

## Required identifier alignment

Keep these identifiers aligned as `com.canva.WebApp`:

- App ID (`com.canva.WebApp`);
- desktop file ID (`com.canva.WebApp.desktop`);
- metainfo component ID (`com.canva.WebApp`).

Changing only one of these values breaks distribution consistency and review readiness.

## Source policy for Flathub

For Flathub submission, avoid branch-based or local-only sources. Prefer stable upstream tags/releases so the build is reproducible for reviewers.

## Known limitation out of scope

Native OAuth popup icon behavior on Linux/Wayland is a known limitation and is **not** a current development target for this Flathub preparation phase.

## Permission review companion

Use `docs/FLATPAK_PERMISSIONS.md` as the maintainer-facing record of current `finish-args`, review rationale, and future minimization checklist. Keep it aligned with `com.canva.WebApp.yml` for each packaging patch.

## Recommended local checks

Run these checks before preparing a Flathub submission PR:

```bash
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
