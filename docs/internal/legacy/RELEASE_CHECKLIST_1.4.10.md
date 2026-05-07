> Legacy historical checklist. Not current release guidance.

# Release Checklist — 1.4.10

This checklist tracks the stable `1.4.10` release closure.

## 1) Version alignment

- [ ] Confirm `package.json` and `package-lock.json` use `1.4.10`.
- [ ] Confirm `CHANGELOG.md` includes `1.4.10-rc.1` and `1.4.10` entries dated `2026-04-26`.
- [ ] Confirm README status reports `Stable: 1.4.10` and `Next: 1.4.11.dev1`.

## 2) Final validation commands

- [ ] `npm run build:preload`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:smoke`
- [ ] `./canva-linux.sh --validate`
- [ ] `git diff --check`

## 3) Optional validator checks (when tools are installed)

- [ ] `desktop-file-validate data/io.github.coletivo420.canva-linux.desktop`
- [ ] `appstreamcli validate --explain data/io.github.coletivo420.canva-linux.metainfo.xml`
- [ ] `./scripts/validate-flatpak.sh`
- [ ] `./scripts/validate-flathub-submission.sh`

## 4) Manual release closure

- [ ] Confirm app launches locally.
- [ ] Confirm OAuth popup/login flow still works.
- [ ] Confirm Canva editor opens and custom eyedropper flow remains active.
- [ ] Confirm local release artifact workflow is documented (`npm run dist` + `./canva-linux.sh --bundle-flatpak`).

## 5) Scope freeze confirmation

- [ ] No TypeScript migration in this release.
- [ ] No Canva API integration in this release.
- [ ] No large refactor/new architecture in this release.
- [ ] No Flathub submission in this release.
