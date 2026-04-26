# TypeScript Migration Plan (`1.4.11.devX`)

## Objective

Introduce TypeScript infrastructure gradually, preserving runtime behavior for Electron, preload bundling, Flatpak packaging, and existing tests.

## Phase `1.4.11.dev1` (foundation)

Delivered in this phase:

- `typescript` and `@types/node` installed as dev dependencies.
- `tsconfig.json` created with:
  - `allowJs: true`
  - `checkJs: true`
  - `noEmit: true`
- npm script `typecheck` added (`tsc --noEmit`).
- `scripts/validate-project.sh` updated so `typecheck` is part of project validation.

## Scope guardrails

- No aggressive conversion to `.ts` in `dev1`.
- Keep Electron runtime entrypoints and preload bundle contract intact.
- Do not commit generated preload bundle artifacts as source-of-truth changes.

## Planned progression

- `dev2`: JSDoc typing on critical JS modules.
- `dev3`: migrate maintenance scripts to TypeScript-first workflow.
- `dev4`: migrate tests to TypeScript.
- `dev5+`: migrate isolated Electron main modules, then sensitive OAuth/IPC modules.
- `dev7`: migrate preload source to TypeScript while keeping runtime bundle output as JavaScript.

## Validation baseline

At minimum for the foundation phase:

```bash
npm run typecheck
npm run validate:project
```
