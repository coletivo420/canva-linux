# c420ui Dependent Project Boundaries

This document defines the boundary between the reusable `c420ui` package and
projects that consume it. The goal is to keep `c420ui` as a generic engine while
allowing each dependent project to provide project-specific metadata, actions,
recipes, and host scripts.

## c420ui owns

- action engine
- command runner
- terminal runtime
- terminal root launch guard
- action scopes
- Linux root/sudo provider base
- detection contracts
- artifact workflow runner
- host dependency contracts
- development/build workflow contracts

## Dependent projects own

- project metadata
- concrete action registry
- concrete artifact recipes
- concrete detection provider
- concrete root policy decisions
- concrete shell scripts
- package naming
- release process

## Forbidden crossings

- project names inside `packages/c420ui/src`
- project-specific env vars inside `packages/c420ui/src`
- project adapters imported by c420ui
- generic engines reimplemented in project adapters
- root launch guard outside c420ui terminal runtime
- concrete package action IDs inside c420ui core

## Examples that checks must reject

- Adding dependent-project names, app IDs, env vars, or action IDs to
  `packages/c420ui/src`.
- Importing `scripts/c420ui-canva-linux`, `scripts/canva-linux`, or
  `config/canva-linux` from `packages/c420ui/src`.
- Reimplementing the c420ui Action Engine, Command Runner, Detection Engine,
  Artifact Workflow Runner, or Linux root provider base in a dependent-project
  adapter.
- Moving root launch checks from `packages/c420ui/src/terminal` into project
  launchers or adapters.
- Moving project detection providers, action registries, artifact recipes, or
  package naming into c420ui core.

## Extension policy

- Action registry validation accepts only `user`, `system`, and `auto` scopes by
  default. Dependent projects that introduce custom scopes must pass an explicit
  `allowedScopes` list to `validateC420UIActions`.
- `normalizeC420UIActionScope` preserves custom scope strings so provider-level
  code can interpret them before or outside strict registry validation.
- The Linux root provider base runs root validation through `bash` by default so
  shell helpers work even when execution bits are not available. Dependent
  projects that need direct executable helpers or another launcher must provide a
  custom `buildRootValidationCommand`.
