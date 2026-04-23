# Release Checklist — 1.4.8-dev.X Finalization

This checklist is intended for the closing phase of the `1.4.8-dev.X` development cycle.

## 1) Version and metadata

- [ ] Confirm `package.json` and `package-lock.json` are set to the same version.
- [ ] Confirm `CHANGELOG.md` contains an entry for the current DEV patch.
- [ ] Confirm docs reference the current DEV version where applicable.

## 2) Documentation integrity

- [ ] Confirm `README.md` reflects current branch goals and known limitations.
- [ ] Confirm `docs/TECHNICAL.md` still matches runtime architecture and maintenance scope.
- [ ] Confirm no documentation introduces behavior promises not implemented in code.

## 3) Non-functional patch guardrails

- [ ] Confirm there are no intentional runtime behavior changes in the patch.
- [ ] Confirm OAuth popup native icon behavior was not modified.
- [ ] Confirm no architecture refactor was introduced.

## 4) Repository hygiene

- [ ] Confirm no backup/reject artifacts were added (`*.bak`, `*.orig`, `*.rej`).
- [ ] Confirm no temporary local test files were committed.
- [ ] Confirm only relevant files are staged for the release patch.

## 5) Manual validation flow

Run the baseline manual validation described in `docs/MANUAL_VALIDATION.md`:

- [ ] App startup and main shell loading.
- [ ] Home tab behavior.
- [ ] OAuth popup opening and completion path.
- [ ] File ingress paths (drop, picker, clipboard) with diagnostics when needed.
- [ ] Wayland/X11 startup mode sanity check.

## 6) Release readiness summary

- [ ] Confirm this DEV patch is explicitly documented as non-functional.
- [ ] Confirm open known limitations are clearly called out.
- [ ] Confirm final reviewer notes include any deferred functional follow-ups.
