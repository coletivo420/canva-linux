# Release Checklist — 1.4.10-dev.6

This checklist is intended for maintainer validation of the current `1.4.10-dev.6` development delivery.

## 1) Version and metadata

- [ ] Confirm `package.json` and `package-lock.json` are set to `1.4.10-dev.6`.
- [ ] Confirm `CHANGELOG.md` contains the `1.4.10-dev.6` entry.
- [ ] Confirm documentation reflects the modular runtime refactor and centralized debug logging.

## 2) Runtime stability guardrails

- [ ] Confirm no intentional user-facing behavior regression was introduced.
- [ ] Confirm OAuth popup native icon behavior was not modified.
- [ ] Confirm the Home tab, toolbar, tab switching, and upload paths still behave as before.

## 3) Manual validation focus

- [ ] Wayland startup sanity check.
- [ ] X11 fallback startup sanity check.
- [ ] Persistent session continuity across restarts.
- [ ] Home tab behavior.
- [ ] Tab creation, switching, and closing behavior.
- [ ] OAuth popup smoke test.
- [ ] The Canva colorpicker still resolves to the bundled `ltcodedev/eyedropper` custom picker.
- [ ] No native browser/system color picker or alternate capture picker replaced the bundled custom picker flow.
- [ ] Upload ingress observation: drag-and-drop, file picker, and clipboard paths.
- [ ] Centralized debug logging check: terminal prefixes and per-start `current.log`.

## 4) Repository hygiene

- [ ] Confirm no backup/reject artifacts were added (`*.bak`, `*.orig`, `*.rej`).
- [ ] Confirm no temporary local test files were committed.
- [ ] Confirm generated directories such as `dist/` and `.flatpak-builder/` do not drive source-review conclusions.
- [ ] Confirm only relevant files are staged for this development delivery.

## 5) Packaging and Flathub readiness

- [ ] Confirm the canonical workflow remains `./canva-linux.sh`.
- [ ] Confirm validation and bundle workflows remain separate from Flathub submission.
- [ ] Confirm permissions, screenshots, and source strategy docs are aligned with the current cycle.

## 6) Release readiness summary

- [ ] Confirm this delivery is documented as a maintainability and Flathub-readiness pass.
- [ ] Confirm known limitations remain documented.
- [ ] Confirm reviewer notes identify any follow-up items deferred to the next cycle.
