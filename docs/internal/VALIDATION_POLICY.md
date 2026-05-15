# Validation Policy

The `0.1.4-14` validation baseline protects the consolidated c420ui and Canva
Linux split. This document is internal maintenance policy for humans and AI
agents. The formal release-candidate checklist is maintained in [RC Validation Matrix](RC_VALIDATION_MATRIX.md).

## Language and i18n

- All maintained code, comments, documentation, UI strings, changelog entries,
  review checklists, and AI instructions must be in English.
- Do not add Portuguese comments, docs, UI strings, or mixed-language source.
- Future i18n requires a dedicated architecture with structured translation
  resources, typed keys, and fallback rules.
- Do not hardcode translations directly in runtime code now.

## Release metadata checks

- `package.json` version is `0.1.4-14`.
- `package-lock.json` top-level version is `0.1.4-14`.
- `package-lock.json` root package version is `0.1.4-14`.
- AppStream metadata contains a `0.1.4-14` release entry.
- Release identity follows `N.N.N-X` for this release line.
- Active release docs point to `0.1.4-14`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and
  `0.1.4.14`.

## Boundary policy

- Canva Linux is a dependent project; c420ui is the generic engine.
- Canva Linux does not install dependencies directly from launchers, except for the documented Stage 0 c420ui bootstrap
  that starts the generated `bootstrap/c420ui` bundle without npm dependencies.
- Canva Linux does not validate generic artifact recipes; c420ui does.
- The Canva Linux adapter must not duplicate Action Engine policy.
- `scripts/preflight-common.sh` is repository-check-only and must not own npm
  install, dependency repair, or skip policy.
- Artifact names must preserve generated architecture strings such as `x86_64`
  or `X86_64`.

## Bootstrap dependency policy

The shell launcher must not install npm dependencies or build c420ui before startup; it must prefer the generated `bootstrap/c420ui` bundle and leave full dependency policy to c420ui after startup.

Allowed bootstrap packages:

- `esbuild`
- `blessed`

The launcher bootstrap must not replace the c420ui Host Dependency Runner. After c420ui starts, c420ui owns full host dependency validation and repair.

The launcher bootstrap must not:

- install all project dependencies as policy
- mutate `package.json`
- mutate `package-lock.json`
- reintroduce `scripts/ensure-npm-dependencies.sh`
- reintroduce `CANVA_REQUIRED_NPM_DEPS`
- reintroduce `CANVA_SKIP_NPM_INSTALL` or `CANVA_NPM_REPAIR`

`C420UI_SKIP_DEPENDENCY_INSTALL` is allowed and must be respected. The old `CANVA_*` npm dependency controls are not allowed.

## RC validation matrix

The release candidate for `0.1.4-14` must use the formal [RC Validation Matrix](RC_VALIDATION_MATRIX.md) before
`v0.1.4-14` is tagged. The matrix records automated commands, manual dry-run checks, dependency-backed packaging checks,
expected results, owner domains, and release blockers.

## Required validation commands

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run check:shared-tooling`
- `npm run check:scripts-core`
- `npm run validate`
- `npm run docs:check-links`
- `npm run docs:check-ai`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm test`
- `./scripts/validate-project.sh`

## Documentation depth policy

New split docs must explain ownership, forbidden ownership crossings,
implementing files, consumed configs/adapters, boundary checks, and forbidden
regressions. Placeholder docs are not acceptable.

## c420ui bootstrap validation policy

Every release validation must confirm that `bootstrap/c420ui/run-c420ui.cjs`, `bootstrap/c420ui/run-c420ui-cli.cjs`, and `bootstrap/c420ui/manifest.json` exist. The manifest must remain `kind: c420ui-bootstrap`, `moduleFormat: commonjs`, and `futureModuleFormat: esm` until a dedicated ESM migration is implemented.

RC validation is blocked when `bootstrap/c420ui/manifest.json` `sourceHash` does not match the current bootstrap source-hash inputs, including the bootstrap hash helper and bootstrap builder. Rebuild with `npm run build:c420ui-bootstrap`, then run `npm run check:c420ui-bootstrap`; the check must pass without requiring additional generated-file changes. The check must also prove that committed bootstrap `.cjs` artifacts are valid JavaScript and match a temporary rebuild from the shared build recipe.

A clean release checkout must be able to start c420ui from the bootstrap bundle without `node_modules`, local `esbuild`, or a prior npm install. The launcher must not install npm dependencies; after startup, c420ui owns full host dependency validation, repair, and workflow execution.


The c420ui bootstrap manifest must keep engine identity and dependent-project identity separate:

- `c420uiVersion` must match `packages/c420ui/package.json`.
- `dependentProjectVersion` must match the repository root `package.json`.
- The manifest must not use an ambiguous top-level `version` field.
- The c420ui engine version must stay distinct from the Canva Linux dependent-project version unless maintainers explicitly request otherwise.

## Interactive bootstrap dependency ordering

Validation must ensure `scripts/run-c420ui.ts` does not import or call the Canva Linux dependency ensure function before
starting c420ui. The interactive flow must wire dependent-project dependency repair through c420ui startup tasks, while
launcher scripts remain free of `npm install`, `npm ci`, and legacy dependency helpers.
