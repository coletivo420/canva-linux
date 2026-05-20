# Flatpak and Flathub

This is the entry point for packaging documentation.

Related documents:

- `FLATPAK_PERMISSIONS.md`
- `FLATHUB_CHECKLIST.md`
- `FLATHUB_SOURCE.md`
- `FLATHUB_SUBMISSION_PATH.md`
- `FLATHUB_SUBMISSION_NOTES.md`


## Purpose

This document explains how to prepare this project for a future Flathub submission while keeping the GitHub release bundle workflow separate.

## Canonical workflow command

Use `./canva-linux-c420ui-builder` as the canonical Linux/Flatpak workflow command.

```bash
./canva-linux-c420ui-builder --install-flatpak
./canva-linux-c420ui-builder --bundle-flatpak
./canva-linux-c420ui-builder --validate
./canva-linux-c420ui-builder --uninstall
./canva-linux-c420ui-builder --reset-user-data
./canva-linux-c420ui-builder --help
```

Notes:

- No arguments open an interactive workflow menu.
- Actions can be chained and run in argument order.
- Use `--uninstall` to detect and remove installed variants.
- Use `--purge` to uninstall detected variants and remove user data.

`0.1.4-dev.22` keeps the Flathub source/readiness focus while standardizing the canonical repository as `coletivo420/canva-linux` and the active app-id as `io.github.coletivo420.canva-linux`.

The preload bundle is generated automatically before the Electron build used by `./canva-linux-c420ui-builder --install-flatpak` and by bundle workflows whenever the Flatpak repo is rebuilt. Treat `electron/preload/canva.bundle.js` as a generated build artifact, not as reviewed source for Flathub. Do not prepare a release bundle from an old `repo/` if preload source changed; `./canva-linux-c420ui-builder --bundle-flatpak` rebuilds the Electron output and Flatpak repo before creating the `.flatpak` artifact.

The lower-level `packages/c420ui/scripts/build-flatpak-bundle.sh --use-existing-repo` option exists only for explicit local reuse of an already reviewed `repo/`. It should not be used for release publication after source, preload, metadata, or packaging changes.

## Validation and lint workflow

Run the standard validation command first:

```bash
./canva-linux-c420ui-builder --validate
```

Then run submission-path preparation/validation and lint checks when Flatpak Builder is available:

```bash
./scripts/prepare-flathub-submission.sh
./scripts/validate-flathub-submission.sh
flatpak run --command=flathub-build org.flatpak.Builder --repo=repo packaging/flathub/manifest.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest packaging/flathub/manifest.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest io.github.coletivo420.canva-linux.yml
./canva-linux-c420ui-builder --install-flatpak --bundle-flatpak
flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```

If Flatpak Builder is missing locally, install it with:

```bash
flatpak install flathub org.flatpak.Builder
```

If `appstreamcli` reports only remote URL or screenshot reachability warnings in an offline/restricted environment, rerun validation with normal network access before treating the metadata URLs as broken.

Local `flatpak-builder-lint repo repo` can still report screenshot mirror findings for a locally generated OSTree repo because screenshots point to stable upstream URLs and are not mirrored to `https://dl.flathub.org/media` outside Flathub infrastructure. The validation helper treats only `appstream-external-screenshot-url` and `appstream-screenshots-not-mirrored-in-ostree` as a documented local limitation; any additional repo-lint error remains fatal.

## Permissions and portals

The app relies on Flatpak portals for file access where possible.

The manifest intentionally avoids broad home-directory access and keeps narrower paths such as `xdg-download` for common local export/import workflows.

## GitHub release bundles vs Flathub submission

- **Local install** (`--install-flatpak`) is for development/testing.
- **Bundle generation** (`--bundle-flatpak`) creates `dist/canva-linux-$VERSION.flatpak` for GitHub releases.
- **Flathub submission** is a separate workflow reviewed in `flathub/flathub`.
- Submission assets live under `packaging/flathub/` (submission manifest, `generated-sources.json`, and helpers).
- `io.github.coletivo420.canva-linux*` identifiers are now the active canonical identity in this cycle (app-id, filenames, icons, and WMClass fields).

Do not treat local GitHub release bundles as a direct Flathub submission mechanism, and do not replace the repository-root local manifest (`io.github.coletivo420.canva-linux.yml`) when preparing submission files.

Source strategy guidance for final Flathub submission lives in `docs/notes/FLATHUB_SOURCE.md`.
Submission-path workflow lives in `docs/notes/FLATHUB_SUBMISSION_PATH.md`, and rationale notes (including thin-wrapper objection handling) live in `docs/notes/FLATHUB_SUBMISSION_NOTES.md`.

- Submission manifest builds should come from a pinned public archive source (`type: archive` + `sha256`) and regenerate Electron output inside the sandbox.
- `dist/linux-unpacked` is acceptable as an internal sandbox build artifact; avoid relying on host-prebuilt `dist/` content.
- Submission build should use `generated-sources.json` + `npm install --offline` to keep npm dependency resolution inside a reviewable, pinned source path.

### npm source generation

`packaging/flathub/scripts/generate-npm-sources.ts` is the maintained source for `generated-sources.json`; the adjacent `.sh` file is only a shell bootstrap. The TypeScript generator reads `package-lock.json`, emits deterministic `npm-cache` tarball sources, converts npm integrity values to Flatpak hash fields, rejects local/workspace/link and `node_modules` path sources, requires HTTPS `.tgz` URLs, checks duplicate URL/hash consistency, and verifies the submission manifest includes `generated-sources.json`.

Run it after every lockfile change:

```bash
./packaging/flathub/scripts/generate-npm-sources.sh
```


## Flathub checklist

See `docs/notes/FLATHUB_CHECKLIST.md` for the practical submission checklist, including:

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
