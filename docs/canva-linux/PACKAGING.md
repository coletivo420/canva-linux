# Canva Linux Packaging

Canva Linux is the dependent project that supplies package recipes; c420ui is
the engine that orchestrates those recipes through generic workflows.

Canva Linux supplies package recipes. c420ui orchestrates artifact workflows,
validates generic recipe contracts, and routes executable phases through the
Action Engine.

## Controls

- Canva Linux package scripts and release recipes.
- Project-specific AppImage and Flatpak command lines.
- Release artifact documentation and expected file names.
- Planned DEB/RPM/AUR declarations.

## Must not control

- Generic c420ui artifact recipe validation.
- Generic workflow policy for planned actions, dry-run, root, or confirmation.
- Architecture normalization in generated artifact names.

## Packaging scripts

- `scripts/build-appimage.sh` builds AppImage artifacts and AppImage-specific
  checksums.
- `scripts/build-flatpak-bundle.sh` builds Flatpak bundles and preserves the
  Flatpak architecture string.
- `scripts/package-guidance-common.sh` prints package-generation guidance without
  changing artifact names.
- `scripts/validate-flatpak.sh` validates Flatpak and AppStream metadata.

## Artifact names

Release artifact names must preserve upstream/tooling architecture strings:

- `canva-linux-0.1.4-14-x86_64.AppImage`
- `canva-linux-0.1.4-14-x86_64.flatpak`
- `canva-linux-0.1.4-14-linux-unpacked-x86_64.tar.gz`
- `SHA256SUMS`

Do not normalize `x86_64` or `X86_64` to `x64`. Do not introduce `${arch}` into
artifact output patterns.

## Planned package targets

DEB, RPM, and AUR workflows are declared as planned targets only. This release
does not implement real DEB/RPM/AUR package builds.

## Boundary checks

- `npm run check:canva-linux`
- `npm run check:c420ui-core`
- `npm run check:shared-tooling`
- `./scripts/validate-project.sh`

## Forbidden regressions

- Do not rename generated artifacts to `x64`.
- Do not make planned DEB/RPM/AUR workflows report executable success.
- Do not bypass c420ui orchestration for artifact actions.
- Do not alter AppImage or Flatpak behavior in docs-only release work.
