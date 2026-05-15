# Canva Linux Configuration

Canva Linux is the dependent project. It declares project data in
`config/canva-linux/`; c420ui consumes that data through the adapter and keeps the
generic engine logic in `packages/c420ui/`.

## Configuration files

### `config/canva-linux/actions.json`

Declares user-facing actions, CLI flags, scopes, root requirements, command
recipes, planned status, dangerous-action metadata, and labels. c420ui validates
and runs these through its Action Engine.

### `config/canva-linux/project-ui.json`

Declares project display metadata for the c420ui project header, including
`displayVersion`, `phase`, app id, executable name, repository URL, launcher
command, logo, and release-note summary.

### `config/canva-linux/development.json`

Declares development tasks and maps them to actions. c420ui converts these tasks
into generic development workflows.

### `config/canva-linux/dependencies.json`

Declares host commands, Node.js minimum policy, npm dependency requirements, and
install strategy inputs. c420ui owns dependency validation and install/repair
policy.

### `config/canva-linux/artifacts.json`

Declares AppImage, Flatpak, native, tarball, checksum, release, and planned
package workflow recipes. c420ui validates artifact recipe contracts and runs
workflows through the Action Engine.

## Must not control

The config files must not implement generic fallback policy. They declare data;
c420ui owns planned-action, dry-run, confirmation, root, dependency, and artifact
recipe policy.

## Implementing files

- `scripts/canva-linux/actions/registry.ts`
- `scripts/c420ui-adapter/actions.ts`
- `scripts/c420ui-adapter/development.ts`
- `scripts/c420ui-adapter/dependencies.ts`
- `scripts/c420ui-adapter/artifacts.ts`
- `scripts/c420ui-adapter/adapter.ts`

## Boundary checks

- `npm run check:canva-linux`
- `npm run check:c420ui-core`
- `npm test`
- `npm run docs:check-ai`

## Forbidden regressions

- Do not move these declarations back under `scripts/`.
- Do not duplicate Action Engine policy in config or adapter code.
- Do not add concrete Canva Linux config paths to c420ui core.
- Do not make Canva Linux install npm dependencies directly.
