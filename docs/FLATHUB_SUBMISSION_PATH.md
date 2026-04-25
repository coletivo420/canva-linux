# Flathub Submission Path (dev16)

## Objective

Keep local development/bundle workflow and Flathub submission workflow separate.

- Local workflow (unchanged): repository-root `com.canva.WebApp.yml` + `./canva-linux.sh`.
- Submission workflow (new path): `packaging/flathub/manifest.yml` + generated npm source manifest + submission scripts.

## Submission path structure

- `packaging/flathub/manifest.yml`
- `packaging/flathub/generated-sources.json`
- `packaging/flathub/scripts/generate-npm-sources.js`
- `packaging/flathub/scripts/generate-npm-sources.sh`
- `scripts/prepare-flathub-submission.sh`
- `scripts/validate-flathub-submission.sh`

## Build/source rules

1. Submission manifest must not use `type: dir`.
2. Submission manifest must use pinned source archive (`type: archive` + `sha256`).
3. NPM dependency sources come from `generated-sources.json`.
4. Build must populate npm cache from generated sources and run `npm install --offline` in sandbox.
5. `dist/linux-unpacked` is generated inside sandbox build only (never consumed from host `dist/`).

## Commands

```bash
./scripts/prepare-flathub-submission.sh
./scripts/validate-flathub-submission.sh
# validate-flathub-submission.sh runs:
# flatpak run --command=flathub-build org.flatpak.Builder --repo=repo packaging/flathub/manifest.yml
# flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest packaging/flathub/manifest.yml
# flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```
