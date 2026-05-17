# c420ui Action Engine

The c420ui Action Engine is the central action-policy layer. It resolves an
action from a bridge, applies policy, and calls `bridge.runAction` only after the
action is allowed to execute.

## Controls

- Action lookup by id and CLI flags.
- Planned action handling.
- Dry-run handling.
- Dangerous-action confirmation through `--yes` / `--force` semantics.
- Root policy and root-access preflight before concrete execution.
- Optional interactive root prompting through `requestRootAccess`.
- Exit-code selection for invalid usage, planned actions, cancellation, and
  failed action execution.

## Must not control

- Concrete Canva Linux command recipes.
- Canva Linux shell script internals.
- Electron runtime behavior, OAuth behavior, or runtime debug behavior.
- Project-specific fallback execution in adapters.

## Planned actions

Planned actions are declared by project metadata and reported as planned without
running concrete commands. A dry-run of a planned action reports success for the
inspection path, while a normal planned-action invocation returns the planned
exit code. Planned actions must not call `bridge.runAction`.

## Dry-run

Dry-run resolves metadata and policy without executing the project command.
Dry-run must not trigger sudo, root prompts, dependency installation, artifact
builds, or adapter fallback execution.

## Confirmation

Dangerous actions require confirmation unless the caller passed `--yes` or the
launcher translated `--force` into yes semantics. Confirmation failure stops
before root policy and before `bridge.runAction`.

## Root policy and requestRootAccess

For root actions, the engine uses the configured root provider before concrete
execution. In terminal mode, `requestRootAccess` can collect administrator input
through the c420ui popup flow. In non-interactive CLI mode, the root provider can
run `validateRootAccess` directly.

The ordering is intentional:

1. Resolve action metadata.
2. Apply planned-action policy.
3. Apply dry-run policy.
4. Apply confirmation policy.
5. Apply root policy through `validateRootAccess` or `requestRootAccess`.
6. Call `bridge.runAction` only after all policy succeeds.

## Implementing files

- `packages/c420ui/src/action-engine.ts`
- `packages/c420ui/src/terminal/interactive-action-runner.ts`
- `packages/c420ui/src/cli.ts`
- `packages/c420ui/src/bridge.ts`
- `packages/c420ui/src/root-provider.ts`
- `scripts/c420ui-adapter/bridge.ts`

## Consumed configs and adapters

The engine consumes actions exposed by the bridge. Canva Linux loads those from
`config/canva-linux/actions.json` through `scripts/c420ui-adapter/actions.ts`
and `scripts/canva-linux/actions/registry.ts`.

## Boundary checks

- `npm run check:c420ui-core` checks policy ordering and ensures root preflight
  happens before `bridge.runAction`.
- `npm run check:canva-linux` checks that the Canva Linux adapter stays thin and
  does not become a policy engine.
- `npm test` covers planned, dry-run, confirmation, root, and interactive root
  flows.

## Forbidden regressions

- Do not call `bridge.runAction` before planned, dry-run, confirmation, and root
  policy finish.
- Do not duplicate planned-action, dry-run, root, or confirmation fallback logic
  inside the Canva Linux adapter.
- Do not make planned actions report executable success.
- Do not trigger sudo or command execution during dry-run.
