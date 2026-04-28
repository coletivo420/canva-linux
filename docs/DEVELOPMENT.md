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
