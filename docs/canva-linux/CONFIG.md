# Canva Linux Configuration

Canva Linux is the dependent project. It declares project data in
`build-resources/canva-linux/config/`; c420ui consumes that data through the adapter and keeps the
generic engine logic in `build-resources/c420ui/`.

## Configuration files

### `build-resources/canva-linux/config/actions.json`

Declares user-facing actions, CLI flags, scopes, root requirements, command
recipes, planned status, dangerous-action metadata, and labels. c420ui validates
and runs these through its Action Engine.

### `build-resources/canva-linux/config/project-ui.json`

Declares project display metadata for the c420ui project header, including
`displayVersion`, `phase`, app id, executable name, repository URL, launcher
command, logo, and release-note summary.

### `build-resources/canva-linux/config/development.json`

Declares development tasks and maps them to actions. c420ui converts these tasks
into generic development workflows.

### `build-resources/canva-linux/config/dependencies.json`

Declares host commands, Node.js minimum policy, npm dependency requirements, and
install strategy inputs. c420ui owns dependency validation and install/repair
policy.

### `build-resources/canva-linux/config/artifacts.json`

Declares AppImage, Flatpak, native, tarball, checksum, release, and planned
package workflow recipes. c420ui validates artifact recipe contracts and runs
workflows through the Action Engine.

## Must not control

The config files must not implement generic fallback policy. They declare data;
c420ui owns planned-action, dry-run, confirmation, root, dependency, and artifact
recipe policy.

## Implementing files

- `build-resources/canva-linux/actions/registry.ts`
- `build-resources/canva-linux/c420ui-adapter/actions.ts`
- `build-resources/canva-linux/c420ui-adapter/development.ts`
- `build-resources/canva-linux/c420ui-adapter/dependencies.ts`
- `build-resources/canva-linux/c420ui-adapter/artifacts.ts`
- `build-resources/canva-linux/c420ui-adapter/adapter.ts`

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
