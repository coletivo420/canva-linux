# Release Checklist — 1.4.10-dev.20

This checklist tracks the `1.4.10-dev.20` quality-gates delivery.

## 1) Version alignment

- [ ] Confirm `package.json` and `package-lock.json` use `1.4.10-dev.20`.
- [ ] Confirm `CHANGELOG.md` includes the `1.4.10-dev.20` section.
- [ ] Confirm README status text references the dev20 quality-gates phase.

## 2) Validation baseline

- [ ] Run `git status`.
- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `./scripts/validate-flatpak.sh`.

## 3) Project quality gates

- [ ] Ensure `scripts/validate-project.sh` exists and is executable.
- [ ] Confirm `./scripts/validate-project.sh` runs lint, tests, docs link checks, Flatpak validation, and `git diff --check`.
- [ ] Confirm no broken imports or duplicate imports remain in touched files.

## 4) Documentation quality

- [ ] Confirm `docs/DEVELOPMENT.md` is aligned with dev20 scope and sequencing.
- [ ] Confirm `docs/VALIDATION.md` documents baseline + close-out commands.
- [ ] Confirm README links to development and validation docs.

## 5) Repository hygiene

- [ ] Confirm no backup/reject/temp artifacts were added.
- [ ] Confirm generated directories (`dist/`, `.flatpak-builder/`) are not staged.
- [ ] Confirm changes are scoped to quality gates and documentation.

## 6) Handoff readiness

- [ ] Summarize warnings (if any) from Flatpak tooling availability.
- [ ] Capture deferred items for dev21/dev22 (large UI, deep refactors, publication work).
- [ ] Ensure commit history remains small and review-friendly.
