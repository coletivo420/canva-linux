# Flathub Submission Checklist

Use this checklist before opening or updating a Flathub submission PR.

## Flathub validation checklist

- [ ] AppStream validation
- [ ] Desktop file validation
- [ ] Manifest lint
- [ ] Repo lint
- [ ] Source strategy reviewed
- [ ] Submission workspace assets updated (`packaging/flathub/`)
- [ ] `scripts/validate-flathub-submission.sh` passes
- [ ] `packaging/flathub/generated-sources.json` regenerated after lockfile changes
- [ ] Stable release tag/source archive selected
- [ ] Manifest source URLs and hashes reviewed
- [ ] Submission manifest source archive URL and sha256 pinned to the exact release input
- [ ] Screenshot URLs reviewed against the final release/tag
- [ ] Permission review
- [ ] Dev18 permission policy completed: kept permissions justified, ScreenSaver removed, broad permissions confirmed absent.
- [ ] Local install smoke test
- [ ] Generated preload bundle reviewed as a build artifact, with modular preload source files reviewed as source
- [ ] Bundle generation test
- [ ] Submission manifest confirms `npm install --offline` workflow
- [ ] Maintainer final review

## Command examples

```bash
./canva-linux.sh --validate
npm run build:preload
./packaging/flathub/scripts/generate-npm-sources.sh
./scripts/validate-flathub-submission.sh
flatpak run --command=flathub-build org.flatpak.Builder --repo=repo packaging/flathub/manifest.yml
./canva-linux.sh --install --bundle
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.Linux.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest packaging/flathub/manifest.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```

## Notes

- Flathub validation commonly expects both manifest lint and repo lint checks.
- If `org.flatpak.Builder` is missing locally, install it with:
  `flatpak install flathub org.flatpak.Builder`
- Review `docs/FLATHUB_SOURCE.md` before preparing the final Flathub source definition.
- The generated `electron/preload/canva.bundle.js` should be regenerated from source during the build and should not replace review of the modular preload source files.
- Release bundle publication must use the default rebuild path so the `.flatpak` is not created from stale Electron output.
- Use `scripts/build-flatpak-bundle.sh --use-existing-repo` only for explicit local reuse of an already reviewed `repo/`, not for release publication after source changes.
- If AppStream validation reports only URL reachability warnings, rerun with normal network access before changing metadata.
- Local repo lint may report only Flathub screenshot mirror findings until screenshots are mirrored by Flathub infrastructure; treat additional repo-lint findings as blockers.
- Keep OAuth status explicit in submission notes: Google OAuth is maintainer-tested; other OAuth providers remain community-tested.
- Final Flathub submission should happen only after maintainer review of lint output, permissions, screenshots, and release source.
