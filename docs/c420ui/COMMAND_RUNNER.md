# c420ui Command Runner

The Command Runner executes a concrete command after the Action Engine has
accepted an action. It is the shared process-execution layer for c420ui-managed
commands.

## Controls

- Child process spawning and exit-code mapping.
- Stdout and stderr forwarding.
- Operational log event emission.
- Output redaction for sensitive values.
- Cancellation handling and signal fallback.
- Command lifecycle status: running, succeeded, failed, or canceled.

## Must not control

- Whether an action is planned, dry-run, dangerous, or root-required. That policy
  belongs to the Action Engine and Root Provider.
- Concrete Canva Linux script contents or package recipes.
- Electron runtime behavior or desktop packaging behavior.

## Implementing files

- `packages/c420ui/src/command-runner.ts`
- `packages/c420ui/src/operational-logs.ts`
- `packages/c420ui/src/events.ts`
- `scripts/c420ui-adapter/adapter.ts`

## Consumed configs and adapters

The runner consumes command descriptors prepared by the dependent-project
adapter. Canva Linux commands originate in `config/canva-linux/actions.json` and
are converted through `scripts/c420ui-adapter/actions.ts`.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm test`

The checks and tests protect command-runner redaction, cancellation, bridge
routing, and adapter execution boundaries.

## Forbidden regressions

- Do not log passwords, sudo stdin, cookies, tokens, or credential material.
- Do not execute commands before the Action Engine accepts the action.
- Do not reimplement command execution inside Canva Linux adapters.
- Do not silently swallow session-log write failures.
