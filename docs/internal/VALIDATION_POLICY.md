# Validation Policy

The `0.1.4-14` validation baseline protects the consolidated c420ui and Canva
Linux split. This document is internal maintenance policy for humans and AI
agents.

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
- Canva Linux does not install dependencies directly from launchers.
- Canva Linux does not validate generic artifact recipes; c420ui does.
- The Canva Linux adapter must not duplicate Action Engine policy.
- `scripts/preflight-common.sh` is repository-check-only and must not own npm
  install, dependency repair, or skip policy.
- Artifact names must preserve generated architecture strings such as `x86_64`
  or `X86_64`.

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
