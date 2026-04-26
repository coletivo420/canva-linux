# Flathub Submission Path (dev17)

## Objective

Keep local Canva-Linux development/bundle workflow and Flathub submission workflow separate.

- Local workflow (unchanged): repository-root `com.canva.Linux.yml` + `./canva-linux.sh`.
- Submission workflow (new path): `packaging/flathub/manifest.yml` + generated npm source manifest + submission scripts.

## Flow boundaries (dev17)

1. **Local development flow**: `./canva-linux.sh --install` uses direct `flatpak-builder --install` for fast iteration.
2. **GitHub release flow**: `./canva-linux.sh --bundle` exports `repo/` and then creates `.flatpak` via `flatpak build-bundle`.
3. **Flathub submission flow**: uses `packaging/flathub/manifest.yml` + generated sources + submission validation; `.flatpak` bundle generation is not part of the submission path.

## Submission path structure

- `packaging/flathub/manifest.yml`
- `packaging/flathub/generated-sources.json`
- `packaging/flathub/scripts/generate-npm-sources.js`
- `packaging/flathub/scripts/generate-npm-sources.sh`
- `scripts/prepare-flathub-submission.sh`
- `scripts/validate-flathub-submission.sh`

## Draft status (dev17)

The current `packaging/flathub/manifest.yml` should be treated as a **submission draft**, not the final stable manifest.

- The source archive is currently pinned to a GitHub commit tarball plus `sha256` to unblock technical validation of the Flathub pipeline during dev17.
- This `archive + sha256` pair is an explicit placeholder and is expected to be reviewed/replaced for the stable submission path.
- Before the stable release track (planned around dev20), switch the source pinning strategy to the release candidate/stable tag material chosen for publication.

## Build/source rules

1. Submission manifest must not use `type: dir`.
2. Submission manifest must use pinned source archive (`type: archive` + `sha256`).
3. NPM dependency sources come from `generated-sources.json`.
4. Build must populate npm cache from generated sources and run `npm install --offline` in sandbox.
5. `dist/linux-unpacked` is generated inside sandbox build only (never consumed from host `dist/`).
6. Submission validation targets reproducible source build + lint/AppStream checks, not direct bundle artifact generation.

## Commands

```bash
./scripts/prepare-flathub-submission.sh
./scripts/validate-flathub-submission.sh
# validate-flathub-submission.sh runs:
# flatpak run --command=flathub-build org.flatpak.Builder --repo=repo packaging/flathub/manifest.yml
# flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest packaging/flathub/manifest.yml
# flatpak run --command=appstreamcli org.flatpak.Builder validate --pedantic --no-net data/com.canva.Linux.metainfo.xml
# flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```
