# Development Workflow — 1.4.11-dev.2

This cycle prioritizes preflight hardening in shell scripts and environment requirement documentation.

## Scope for dev2

In scope:

- Script preflight ordering before Node/npm/Flatpak usage.
- Canonical validation workflow alignment.
- Development and validation requirements documentation.

Out of scope:

- Major UI redesigns.
- Full app architecture rewrites.
- Deep Flatpak workflow redesign.
- Framework migration.

## Host requirements

The development workflow requires:

- Node.js >= 22
- npm
- Git
- Bash
- Flatpak
- flatpak-builder

Optional but recommended for full validation:

- desktop-file-validate
- appstreamcli
- curl
- sha256sum
- tar

Distribution-specific installation commands are documented in README.md.

## Recommended execution order

1. `npm install`
2. `npm run build:preload`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run docs:check-links`
7. `./scripts/validate-project.sh`

## Flatpak installation scope policy

Canva Linux local workflows must not create a duplicate Flathub user remote by default.

Default policy:

- `./canva-linux.sh --install` uses the system Flatpak installation.
- Required runtimes are installed from the system Flathub remote.
- The user Flathub remote is never added unless explicitly requested.
- Developers who want a fully user-scoped install may run:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install
```

Development smoke tests should prefer:

```bash
./canva-linux.sh --run-dev
```

because it builds and runs from `build-dir` without installing the app or creating local origin remotes.
