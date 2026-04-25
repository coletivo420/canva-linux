# Release Checklist — 1.4.10-dev.8

This checklist is intended for maintainer validation of the current `1.4.10-dev.8` development delivery.

## 1) Version and metadata

- [ ] Confirm `package.json` and `package-lock.json` are set to `1.4.10-dev.8`.
- [ ] Confirm `CHANGELOG.md` contains the `1.4.10-dev.8` entry.
- [ ] Confirm documentation reflects the modular runtime refactor, centralized debug logging, and generated Canva preload bundle.

## 2) Runtime stability guardrails

- [ ] Confirm no intentional user-facing behavior regression was introduced.
- [ ] Confirm OAuth popup native icon behavior was not modified.
- [ ] Confirm the Home tab, toolbar, tab switching, and upload paths still behave as before.
- [ ] Confirm the eyedropper fix restores the intended custom picker behavior without introducing a new native/system picker path.

## 3) Manual validation focus

- [ ] Wayland startup sanity check.
- [ ] X11 fallback startup sanity check.
- [ ] Persistent session continuity across restarts.
- [ ] Home tab behavior.
- [ ] Tab creation, switching, and closing behavior.
- [ ] OAuth popup smoke test.
- [ ] The Canva colorpicker still resolves to the bundled `ltcodedev/eyedropper` custom picker.
- [ ] The Canva editor loads `electron/preload/canva.bundle.js` and the preload reaches `modules-loaded`.
- [ ] No native browser/system color picker or alternate capture picker replaced the bundled custom picker flow.
- [ ] Upload ingress observation: drag-and-drop, file picker, and clipboard paths.
- [ ] Centralized debug logging check: terminal prefixes and per-start `current.log`.

## 4) Repository hygiene

- [ ] Confirm no backup/reject artifacts were added (`*.bak`, `*.orig`, `*.rej`).
- [ ] Confirm no temporary local test files were committed.
- [ ] Confirm `electron/preload/canva.bundle.js` is regenerated for local testing but not committed as source.
- [ ] Confirm generated directories such as `dist/` and `.flatpak-builder/` do not drive source-review conclusions.
- [ ] Confirm only relevant files are staged for this development delivery.
- [ ] Confirm unused inherited eyedropper helper APIs and not-implemented stubs are not present in the bundled picker copy.

## 5) Packaging and Flathub readiness

- [ ] Confirm the canonical workflow remains `./canva-linux.sh`.
- [ ] Confirm release bundle publication uses the default rebuild path, not `scripts/build-flatpak-bundle.sh --use-existing-repo`, so the generated preload bundle is current.
- [ ] Confirm validation and bundle workflows remain separate from Flathub submission.
- [ ] Confirm permissions, screenshots, and source strategy docs are aligned with the current cycle.

## 6) Security and IPC guardrails

- [ ] Confirm unsafe external URL schemes are blocked instead of passed to the system opener.
- [ ] Confirm eyedropper snapshot IPC only serves the requesting Canva tab.
- [ ] Confirm aborting the custom eyedropper flow clears the picker overlay/state.

## 7) Release readiness summary

- [ ] Confirm this delivery is documented as a maintainability and Flathub-readiness pass.
- [ ] Confirm known limitations remain documented.
- [ ] Confirm reviewer notes identify any follow-up items deferred to the next cycle.
