# c420ui Action Engine

The c420ui Action Engine is the central action-policy layer. It resolves an
action from a bridge, marshals the project-provided contract, and delegates
execution to `c420ui-host action-run --json-lines`.

Dev12 moves the action registry source toward Rust project config. When
`projectConfigRoot` is provided, TypeScript sends only `rootDir`, `actionId`,
`projectConfigRoot`, run flags and environment. `c420ui-host` loads
`actions.json` through the Rust `project` module and resolves the action there.
Inline `actions` remain only a transitional fallback.

Dev12 also moves bootstrap and metadata to `c420ui-host`. Generated
`run-c420ui-cli.mjs` is a thin launcher that locates `c420ui-host` and passes
CLI arguments through; it must not embed Action Engine, adapter/config parser,
status panel, or bootstrap manifest logic.

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

Planned actions are declared by project metadata and reported as planned by
`c420ui-host` without running concrete commands. A dry-run of a planned action
reports success for the inspection path, while a normal planned-action
invocation returns the planned exit code.

## Dry-run

Dry-run resolves metadata and policy without executing the project command.
Dry-run must not trigger sudo, root prompts, dependency installation, artifact
builds, or adapter fallback execution.

## Confirmation

Dangerous actions require confirmation unless the caller passed `--yes` or the
launcher translated `--force` into yes semantics. Confirmation failure is
reported by `c420ui-host` before command execution.

## Root policy and requestRootAccess

For root actions, `c420ui-host` emits a `root-request` event before concrete
execution. The TypeScript bridge still owns project-provided root provider
integration for now: terminal mode can collect administrator input through
`requestRootAccess`, and non-interactive CLI mode can run `validateRootAccess`
directly before sending `root-response` back to Rust.

The ordering is intentional:

1. Resolve action metadata.
2. Apply planned-action policy.
3. Apply dry-run policy.
4. Apply confirmation policy.
5. Emit/handle `root-request` and `root-response` when root is required.
6. Execute declarative command actions in `c420ui-host`.

## Implementing files

- `build-resources/c420ui/src/action-engine.ts`
- `build-resources/c420ui/src/rust-action-engine.ts`
- `build-resources/c420ui/src/rust-bootstrap.ts`
- `build-resources/c420ui-rs/src/action/`
- `build-resources/c420ui-rs/src/bootstrap/`
- `build-resources/c420ui-rs/src/commands/action_run.rs`
- `build-resources/c420ui/src/terminal/interactive-action-runner.ts`
- `build-resources/c420ui/src/cli.ts`
- `build-resources/c420ui/src/bridge.ts`
- `build-resources/c420ui/src/root-provider.ts`
- `build-resources/canva-linux/c420ui-adapter/bridge.ts`

## Consumed configs and adapters

The preferred engine path consumes actions from `projectConfigRoot` through
`c420ui-host project-config --json` / Rust project config loading. The bridge
may still expose actions for menus and transitional compatibility, but it must
not be the source of truth for action validation or execution policy.

## Boundary checks

- `npm run check:c420ui-core` checks that TypeScript uses the Rust Action Engine
  bridge and does not reintroduce TypeScript action execution.
- `npm run check:canva-linux` checks that the Canva Linux adapter stays thin and
  does not become a policy engine.
- `npm test` covers planned, dry-run, confirmation, root, and interactive root
  flows.

## Forbidden regressions

- Do not reintroduce TypeScript action execution or a fallback Action Engine.
- Do not duplicate planned-action, dry-run, root, or confirmation fallback logic
  inside the Canva Linux adapter.
- Do not make planned actions report executable success.
- Do not trigger sudo or command execution during dry-run.
