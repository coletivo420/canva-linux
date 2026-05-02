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
