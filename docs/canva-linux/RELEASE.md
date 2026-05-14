# Canva Linux Release

Canva Linux is the dependent project that owns release metadata; c420ui is the
engine that validates and runs the configured release workflows.

Canva Linux is the dependent release project. c420ui provides terminal and action
orchestration, but Canva Linux owns release metadata, package identity, AppStream
metadata, and generated distribution artifacts.

## Release target

- Version: `0.1.4-14`
- Tag form: `v0.1.4-14`
- Versioning rule: `N.N.N-X`
- Forbidden forms: `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`

## Required metadata

- `package.json` must contain `0.1.4-14`.
- `package-lock.json` top-level and root package versions must contain
  `0.1.4-14`.
- `config/canva-linux/project-ui.json` and `scripts/app-identity-common.sh` must
  expose the same display version and phase.
- `data/io.github.coletivo420.canva-linux.metainfo.xml` must contain the
  AppStream release entry for `0.1.4-14` dated `2026-05-14`.

## Release artifacts

Expected `dist/` artifacts preserve generated architecture names:

- `canva-linux-0.1.4-14-x86_64.AppImage`
- `canva-linux-0.1.4-14-x86_64.flatpak`
- `canva-linux-0.1.4-14-linux-unpacked-x86_64.tar.gz`
- `SHA256SUMS`

## Required checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run check:shared-tooling`
- `npm run check:scripts-core`
- `npm run validate`
- `npm run docs:check-links`
- `npm run docs:check-ai`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm test`
- `./scripts/validate-project.sh`

## Boundary checks

`validate-project` runs source, docs, AI, Flatpak, AppStream, and runtime-build
checks. AppStream validation may report old development release ordering as an
informational message because the current release entry must remain first.

## Forbidden regressions

- Do not change the version away from `0.1.4-14` in this commit.
- Do not change AppImage/Flatpak behavior or artifact names.
- Do not normalize architecture strings to `x64`.
- Do not publish c420ui, migrate to ESM, or implement DEB/RPM/AUR package builds.
