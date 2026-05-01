# Development Workflow — 1.4.11-dev.14

This cycle stabilizes the first TypeScript leaf conversion while preserving the stabilized Flatpak system-wide workflow.

## Scope for dev14

In scope:

- Broad `npm run typecheck` coverage for converted `.ts` runtime modules.
- Source-first tests that do not generate `.build/`.
- Leaf TypeScript conversion for shared logging/debug helpers.
- Flatpak system-scope dependency and install policy preservation.
- Flatpak artifact ownership restoration after local workflows.
- Local Flatpak repo remote compatibility for system installs.
- Local Flatpak remote cleanup during uninstall.
- Runtime permission hardening for OAuth providers.
- Preload logging cleanup outside `CANVA_DEBUG`.
- Source-mode preload bundling while shared modules move to TypeScript.
- FedCM / Google One Tap warning classification as upstream page-code diagnostics.
- Canonical validation workflow alignment.
- Development and validation requirements documentation.

Out of scope:

- Major UI redesigns.
- Full app architecture rewrites.
- Deep Flatpak workflow redesign beyond preserving the current system-scope policy.
- Framework migration.
- Monkeypatching Google Identity Services, Google One Tap, or FedCM page APIs.

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

## DEV14 stabilization notes

- System-scope local installs build as the current user, export `repo/`, and configure the system Flatpak local remote with a `file://` URI derived from the absolute repo path. A plain absolute path can make Flatpak fail while fetching `summary.idx`.
- `npm run build:preload` remains a supported source-mode workflow. While TypeScript conversion is in progress, `scripts/build-preload-bundle.js` must resolve `.ts` source modules when the matching `.js` source no longer exists and transpile them before embedding them in the generated bundle.
- `npm run build:runtime` remains the packaging path. It compiles TypeScript into `.build/electron/**/*.js` first, then runs the preload bundler in build-output mode against those compiled files.
- `npm test` must not call `scripts/build-runtime.js` or create `.build/`; tests load source `.js` directly and transpile source `.ts` modules in memory.
- `./canva-linux.sh --uninstall` also removes local development remotes: `canva-linux-local`, `canva-linux1-origin`, and `debug1-origin`.
