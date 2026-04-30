# Development Workflow — 1.4.11-dev.13

This cycle begins low-risk TypeScript leaf conversion while preserving the stabilized Flatpak system-wide workflow.

## Scope for dev13

In scope:

- Leaf TypeScript conversion for shared logging/debug helpers.
- Flatpak system-scope dependency and install policy preservation.
- Flatpak artifact ownership restoration after local workflows.
- Runtime permission hardening for OAuth providers.
- Preload logging cleanup outside `CANVA_DEBUG`.
- Canonical validation workflow alignment.
- Development and validation requirements documentation.

Out of scope:

- Major UI redesigns.
- Full app architecture rewrites.
- Deep Flatpak workflow redesign beyond preserving the current system-scope policy.
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
2. `npm run lint`
3. `npm run typecheck`
4. `npm run typecheck:strict`
5. `npm test`
6. `npm run docs:check-links`
7. `npm run docs:check-ai`
8. `./scripts/check-flatpak-scope-policy.sh`
9. `npm run build:runtime`
10. `npm run build:check`

## Flatpak installation scope policy

Canva Linux local workflows must not create a duplicate Flathub user remote by default.

Default policy:

- `./canva-linux.sh --install` uses the system Flatpak installation.
- Required runtimes and SDK/BaseApp dependencies are installed from the system Flathub remote.
- The user Flathub remote is never added unless explicitly requested.
- Local Flatpak artifact ownership is restored to the current user after install, bundle and dev-run workflows.
- Developers who want a fully user-scoped install may run:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install
```

Development smoke tests should prefer:

```bash
./canva-linux.sh --run-dev
```

because it builds and runs from `build-dir` without installing the app or creating local origin remotes.
