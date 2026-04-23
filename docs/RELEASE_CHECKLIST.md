# Release Checklist — 1.4.8-rc.1 Validation

This checklist is intended for final manual validation of `1.4.8-rc.1` before promoting the final `1.4.8` release.

## 1) Version and metadata

- [ ] Confirm `package.json` and `package-lock.json` are set to `1.4.8-rc.1`.
- [ ] Confirm `CHANGELOG.md` contains the `1.4.8-rc.1` entry.
- [ ] Confirm release documentation keeps release-candidate scope explicit.

## 2) Non-functional release-candidate guardrails

- [ ] Confirm there are no intentional runtime behavior changes in this RC.
- [ ] Confirm OAuth popup native icon behavior was not modified.
- [ ] Confirm no architecture refactor was introduced.

## 3) Manual validation focus (required before final `1.4.8`)

- [ ] Wayland startup sanity check.
- [ ] X11 fallback startup sanity check.
- [ ] Persistent session continuity across restarts.
- [ ] Home tab behavior.
- [ ] Tab creation/switch/close behavior.
- [ ] OAuth popup smoke test (open + completion path).
- [ ] Custom eyedropper availability and basic use.
- [ ] Upload ingress observation: drag-and-drop, file picker, and clipboard paths.

## 4) Repository hygiene

- [ ] Confirm no backup/reject artifacts were added (`*.bak`, `*.orig`, `*.rej`).
- [ ] Confirm no temporary local test files were committed.
- [ ] Confirm only relevant files are staged for the RC patch.

## 5) Release readiness summary

- [ ] Confirm this RC is documented as final manual validation only.
- [ ] Confirm known limitations from the development series remain documented.
- [ ] Confirm reviewer notes clearly identify any follow-up items deferred to post-`1.4.8` work.
