# TypeScript

Canva Linux is TypeScript-first for Electron runtime code, Node.js maintenance logic, tests, tooling configs and Flathub helper scripts.

## Current state

- Electron main and preload source modules are TypeScript.
- Node.js maintenance scripts use TypeScript source files and shell bootstraps where Node cannot execute TypeScript directly.
- Tests live under `test/**/*.ts`; `npm test` compiles them into `.build/test/` with inline source maps before running `node --test` on generated JavaScript.
- ESLint and Playwright use `eslint.config.ts` and `playwright.config.ts`.
- Runtime output remains CommonJS-compatible generated JavaScript under `.build/`.
- JavaScript is not maintained as source code in `scripts/`, `test/`, configs, or `packaging/flathub/scripts/`.

## TypeScript-first source policy

Allowed maintained source formats:

- `electron/**/*.ts`
- `scripts/**/*.ts`
- `scripts/**/*.sh`
- `scripts/core/*.ts`
- `test/**/*.ts`
- `eslint.config.ts`
- `playwright.config.ts`
- `packaging/flathub/scripts/*.ts`
- JSON, YAML, XML, desktop entries, HTML, and shell files in their native formats

Allowed generated JavaScript:

- `.build/**/*.js`
- package-managed dependencies under `node_modules/**/*.js`

Forbidden maintained JavaScript source:

- `scripts/*.js`
- `test/**/*.js`
- `packaging/flathub/scripts/*.js`
- `eslint.config.js`
- `playwright.config.js`

`check-typescript-first.ts` enforces this policy and fails if maintained JavaScript source returns outside generated output.

## Script Core

Project validations, contracts, and registries are implemented in TypeScript under `scripts/core/`.

- `npm run build:scripts-core` compiles core entries with esbuild into `.build/scripts/core/`.
- `scripts/run-core-entry.sh` builds the core on demand when compiled artifacts are missing, then runs the generated `.build/scripts/core/<entry>.js` artifact.
- `npm run build:typescript-runner` compiles `scripts/run-typescript-script.ts` into `.build/scripts/bootstrap/run-typescript-script.js`.
- `npm run run:ts -- <entry.ts>` runs standalone TypeScript entrypoints through that generated bootstrap and writes per-entry generated JavaScript under `.build/scripts/typescript/`.
- `npm run check:scripts-core` runs the generated core validation artifacts and includes the TypeScript-first closure checks.

Migrated core entries include:

- `action-registry.ts`
- `action-runner.ts`
- `validate-actions.ts`
- `overview-status.ts`
- `check-ai-guardrails.ts`
- `check-no-shell-menu.ts`
- `check-sudo-contract.ts`
- `check-action-contract.ts`
- `check-detection-contract.ts`
- `check-version-consistency.ts`
- `check-review-checklist.ts`
- `check-shell-action-ids.ts`
- `check-doc-links.ts`
- `check-dependency-policy.ts`
- `check-runtime-build.ts`
- `check-typescript-wrapper-contract.ts`
- `check-typescript-first.ts`

Standalone TypeScript script entrypoints include:

- `build-runtime.ts`
- `build-preload-bundle.ts`
- `copy-runtime-assets.ts`
- `clean-runtime-build.ts`
- `electron-builder-before-build.ts`
- `run-node-tests.ts`
- `run-tui.ts`
- `register-typescript.ts`
- `run-typescript-script.ts`

Test execution:

- `scripts/run-node-tests.ts` compiles `test/**/*.ts` to `.build/test/**/*.js` with inline source maps.
- `npm test` runs `node --test` against `.build/test/**/*.test.js`; Node does not execute TypeScript test files directly.
- `test/helpers/runtime-module.ts` loads Electron runtime TypeScript sources for module-level tests and no longer falls back to JavaScript source files.

Flathub source generation:

- `packaging/flathub/scripts/generate-npm-sources.ts` owns package-lock parsing, npm source list generation, integrity hash conversion, deterministic ordering, and `generated-sources.json` writing.
- The generator rejects local/workspace/link resolved dependencies, `node_modules` path sources, non-HTTPS tarballs, invalid integrity fragments, duplicate URL/hash conflicts, and missing `packaging/flathub/manifest.yml` wiring for `generated-sources.json`.
- `packaging/flathub/scripts/generate-npm-sources.sh` invokes the TypeScript generator through `npm run run:ts`, which uses the generated runner bootstrap.

## Commands

```bash
npm run typecheck
npm run typecheck:strict
npm test
npm run build:runtime
npm run build:scripts-core
npm run check:scripts-core
npm run check:typescript-wrappers
npm run check:typescript-first
```

## Rules

- New Node.js logic must be written in TypeScript by default.
- Do not add maintained JavaScript source files.
- Do not duplicate TypeScript core logic in JavaScript fallbacks.
- Do not edit `.build/` manually.
- Do not edit generated preload bundles manually.
- Keep runtime behavior stable during type-only changes.
- Prefer small module conversions and targeted tests.
- In preload/runtime TypeScript files, always provide explicit Promise generic types when resolving structured objects that are destructured/consumed by shape.

Example:

```ts
return new Promise<SnapshotCanvas>((resolve, reject) => {
  resolve({ host, canvas });
});
```

Avoid:

```ts
return new Promise((resolve, reject) => {
  resolve({ host, canvas });
});
```

## Future cleanup

- Remove stale `@ts-nocheck` directives where possible.
- Improve type coverage in preload modules and migrated tests.
- Consider ESM only as a separate future architecture decision.
