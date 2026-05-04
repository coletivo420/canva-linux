# Flathub Source Strategy

## Purpose

This document explains the current Canva Linux local Flatpak manifest source workflow and what must change before a final Flathub submission.

## Current local manifest workflow

The local manifest currently uses:

```yaml
sources:
  - type: dir
    path: .
```

This works for local development because `flatpak-builder` reads the checked-out repository directly. That is convenient for maintainer testing with `./canva-linux.sh`, local installs, and GitHub `.flatpak` bundle generation.

## Why `type: dir` with `path: .` is not the final Flathub source strategy

Using a local directory source is acceptable for local maintainer workflows, but it is not ideal for final Flathub submission because:

- it depends on the local checkout state;
- it can accidentally include local-only files or generated artifacts;
- it does not provide the stable remote source reference expected for reviewable source builds;
- it is not the right long-term source strategy for a reproducible Flathub submission.

The Flathub package must not rely on local untracked files, generated files, or maintainer-specific workspace state.

## Future Flathub submission expectation

The final Flathub submission should build from a stable release tag or stable source archive selected for that release.

Before submission, the maintainer must review:

- the chosen stable release tag or source archive;
- all manifest source URLs;
- all source hashes;
- whether the source input matches the intended reviewed release contents.

## Generated preload bundle

The Canva editor runtime uses `electron/preload/canva.bundle.js`, but that file is generated from the modular source files before the Electron build.

For source review, treat the maintained files under `electron/preload/*.js`, `electron/shared/*.js`, and `scripts/build-preload-bundle.js` as the source of truth. The final Flathub build path should regenerate the bundle from those sources instead of relying on a local untracked bundle artifact.

## Screenshot URL review

Screenshot URLs must also be stable and reviewed before final submission. Branch-based screenshot URLs are not acceptable for the final Flathub review path.

The maintainer should verify that screenshot URLs point to the final reviewed release or tag context used for submission.

## Submission workspace separation (dev17)

To keep local maintainer workflows and Flathub review workflows separate, this repository now has a dedicated submission workspace at:

- `packaging/flathub/`

That folder contains:

- `manifest.yml` (submission-oriented manifest)
- `generated-sources.json` (npm dependency manifest for Flathub source builds)
- `scripts/generate-npm-sources.sh` (helper wrapper) and `scripts/generate-npm-sources.js` (lockfile-to-manifest generator)
- `scripts/prepare-flathub-submission.sh` and `scripts/validate-flathub-submission.sh` (submission-path automation)

The repository-root `io.github.coletivo420.canva-linux.yml` is the canonical **local** workflow manifest used by `./canva-linux.sh`.

The submission manifest in `packaging/flathub/manifest.yml` uses a pinned public archive (`type: archive` + `sha256`) and generates `dist/linux-unpacked` inside the Flatpak build sandbox.

Using `dist/linux-unpacked` as an **internal build artifact** is acceptable. The important requirement is to avoid consuming a prebuilt `dist/` from the host checkout state.

For Flathub-reviewable Node/Electron builds, keep npm dependencies in `packaging/flathub/generated-sources.json` and run `npm install --offline` inside the sandbox build.

## Release workflow separation

GitHub `.flatpak` bundle releases and Flathub source builds are separate workflows.

- Local development installs default to the system Flatpak scope, build as the current user, export `repo/`, then install from that local repo with administrator authorization.
- Development smoke tests should prefer `./canva-linux.sh --install-flatpak` to verify the full package workflow.
- GitHub bundle releases are generated from the repository workflow (`repo/` export + `flatpak build-bundle`) for direct distribution.
- Flathub source builds are reviewed separately, should use stable source URLs appropriate for Flathub submission, and should not require `.flatpak` bundle creation.

Do not treat the GitHub bundle workflow as a substitute for Flathub source review.

## Flatpak installation scope policy

Canva Linux local workflows must not create a duplicate Flathub user remote by default.

Default policy:

- `./canva-linux.sh --install-flatpak` uses the system Flatpak installation.
- Required runtimes and SDK/BaseApp dependencies are installed from the system Flathub remote.
- The user Flathub remote is never added unless explicitly requested.
- Local Flatpak artifact ownership is restored to the current user after install, bundle and dev-run workflows.
- Developers who want a fully user-scoped install may run:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install-flatpak
```

## Maintainer review requirement

Before a final Flathub submission, the maintainer must review source URLs, source hashes, and screenshot URLs against the intended stable release input.

For practical submission-path commands and rationale notes, see `docs/FLATHUB_SUBMISSION_PATH.md` and `docs/FLATHUB_SUBMISSION_NOTES.md`.
