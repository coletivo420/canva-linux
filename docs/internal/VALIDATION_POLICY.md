# Validation Policy

The 0.1.4-14 validation baseline protects the consolidated c420ui and Canva Linux split.

Required release metadata checks:

- `package.json` version is `0.1.4-14`.
- `package-lock.json` top-level version is `0.1.4-14`.
- `package-lock.json` root package version is `0.1.4-14`.
- AppStream metadata contains a `0.1.4-14` release entry.
- Release identity follows `N.N.N-X` for this release line.
- Active release docs point to `0.1.4-14`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`.

Required validation commands are listed in `docs/VALIDATION.md`.
