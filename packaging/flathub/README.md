# Flathub submission workspace

This directory contains assets specific to the **Flathub submission path**.

It is intentionally separate from the repository-root `com.canva.WebApp.yml`, which remains the canonical manifest for the local workflow (`./canva-linux.sh --install|--bundle|--validate`).

## Files in this directory

- `manifest.yml` — submission-oriented manifest using a pinned public archive source (`type: archive` + `sha256`) and offline npm install flow.
- `generated-sources.json` — npm dependency manifest consumed by the submission manifest for offline installation.
- `scripts/generate-npm-sources.js` and `scripts/generate-npm-sources.sh` — helper scripts to regenerate `generated-sources.json` from `package-lock.json`.

## Maintainer notes

- Regenerate dependency sources whenever `package-lock.json` changes:
  - `./packaging/flathub/scripts/generate-npm-sources.sh`
- Validate submission assets with:
  - `./scripts/validate-flathub-submission.sh`
  - This runs `flathub-build`, `flatpak-builder-lint manifest`, and `flatpak-builder-lint repo` when `org.flatpak.Builder` is available.
- The submission manifest populates npm cache from `generated-sources.json` and runs `npm install --offline` in the Flatpak sandbox.
- The submission manifest builds Electron artifacts inside the sandbox and copies generated `dist/linux-unpacked` into `/app/main`.
- `dist/linux-unpacked` must be generated during sandbox build; do not depend on a prebuilt `dist/` from host checkout.
