# Canva Linux Flatpak

Canva Linux is the dependent project for this package target; c420ui is the
engine that exposes the workflow and enforces generic action policy.

Canva Linux provides the Flatpak manifest, bundle scripts, and validation notes.
c420ui orchestrates the related actions through generic workflow contracts.

## Controls

- Flatpak manifest, AppStream metadata, and package metadata.
- Flatpak local install and bundle scripts.
- Preservation of Flatpak artifact names produced by the packaging scripts.
- Flatpak permission documentation.
- Flathub submission notes.

## Must not control

- Generic c420ui artifact workflow validation.
- Generic Action Engine or Root Provider policy.
- Flatpak architecture renaming to `x64`.

## Implementing files

- `io.github.coletivo420.canva-linux.yml`
- `scripts/build-flatpak-bundle.sh`
- `scripts/install-flatpak-local.sh`
- `scripts/flatpak-build-common.sh`
- `scripts/validate-flatpak.sh`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/notes/FLATHUB.md`

## c420ui interaction

Flatpak actions and artifact workflows are declared in project config and loaded
through the adapter. c420ui handles dry-run, planned-action, confirmation, and
root policy before the Flatpak scripts run.

## Boundary checks

- `npm run check:canva-linux`
- `./scripts/validate-project.sh`
- `./scripts/validate-flatpak.sh`
- `./scripts/validate-flathub-submission.sh`

## Forbidden regressions

- Do not alter Flatpak behavior as part of documentation-only release work.
- Do not normalize Flatpak architecture names to `x64`.
- Do not move Flatpak recipes into c420ui core.
