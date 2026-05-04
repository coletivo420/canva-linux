# TypeScript

Canva Linux is migrating incrementally to TypeScript.

## Current state

- Electron main runtime uses compiled output from `.build/electron/main/`.
- Main process modules are TypeScript.
- Preload source modules are TypeScript.
- Runtime remains CommonJS-compatible.
- Generated runtime files are not committed.

## Commands

```bash
npm run typecheck
npm run typecheck:strict
npm run build:runtime
npm run build:check
```

## Rules

- Do not edit `.build/` manually.
- Do not edit generated `electron/preload/canva.bundle.js` manually.
- Keep runtime behavior stable during type-only changes.
- Prefer small module conversions and targeted tests.

## Future cleanup

- Remove stale `@ts-nocheck` directives where possible.
- Improve type coverage in preload modules.
- Consider ESM only as a separate future architecture decision.


## Preload bundling

The preload bundle is generated with esbuild.

- Source mode: `npm run build:preload`
- Runtime mode: `npm run build:runtime`

The output remains CommonJS and is written to:

```text
electron/preload/canva.bundle.js
.build/electron/preload/canva.bundle.js
```

Electron is treated as an external runtime dependency.
