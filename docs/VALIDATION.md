# Validation Guide

## Validation requirements

The canonical validation command is:

```bash
./canva-linux.sh --validate
```

It requires:

- Node.js >= 22
- npm
- Git
- Bash

Flatpak validation additionally requires:

- flatpak
- org.flatpak.Builder runtime (for `flatpak run --command=... org.flatpak.Builder` checks)

Desktop and AppStream validation use:

- desktop-file-validate
- appstreamcli

Flathub source validation may require:

- curl
- sha256sum
- tar

## Validation flow

```text
1. npm run build:preload
2. npm run lint
3. npm run typecheck
4. npm test
5. npm run docs:check-links
6. desktop-file-validate, if available
7. appstreamcli validate --explain, if available
8. ./scripts/validate-flatpak.sh
9. ./scripts/validate-flathub-submission.sh
10. git diff --check
```

## Baseline diagnostics (before editing)

```bash
git status
npm run lint
npm test
./scripts/validate-flatpak.sh
```
