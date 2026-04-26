# Validation Guide

The canonical project validation entrypoint is:

```bash
./scripts/validate-project.sh
```

It runs the following sequence:

1. `npm run lint`
2. `npm test`
3. `npm run docs:check-links`
4. `./scripts/validate-flatpak.sh`
5. `git diff --check`

## Baseline diagnostics (before editing)

Run these commands before making changes to measure current health:

```bash
git status
npm run lint
npm test
./scripts/validate-flatpak.sh
```

## Close-out checks (before commit/merge)

```bash
npm run lint
./scripts/validate-project.sh
git diff --check
```

## Notes on environment warnings

Some Flatpak checks are skipped in environments that do not provide:

- `flatpak`
- `desktop-file-validate`
- `appstreamcli`

These warnings are expected in minimal CI/sandbox environments and do not block local lint/test verification.
