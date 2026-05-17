# c420ui Architecture

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
See [c420ui Builder Alias Policy](BUILDER_ALIAS.md).

c420ui is the generic terminal engine used by Canva Linux. It owns shared
terminal behavior and action orchestration, while Canva Linux remains the
dependent project that supplies metadata, actions, recipes, and runtime scripts.

## Controls

- Terminal workspace composition, focus zones, help text, logs, progress state,
  and root-auth prompts.
- Action policy through the Action Engine before any command reaches a project
  adapter.
- Command execution, event emission, operational log redaction, and cancellation.
- Generic root-provider contracts and the Linux root-provider base.
- Generic host dependency and artifact workflow contracts.
- Detection, development-provider, and bridge contracts that dependent projects
  implement or configure.

## Must not control

- Canva Linux Electron runtime behavior, OAuth behavior, runtime debug flags, tabs,
  uploads, CL-EyeDropper, credential-storage decisions, or browser policy.
- Canva Linux action IDs, AppStream metadata, desktop file IDs, package names,
  shell scripts, or package recipes.
- Concrete dependency lists or npm package names for a dependent project.
- Release artifact names beyond validating that recipes preserve generated
  architecture names.

## Implementing files

- `packages/c420ui/src/action-engine.ts`
- `packages/c420ui/src/command-runner.ts`
- `packages/c420ui/src/root-provider.ts`
- `packages/c420ui/src/linux-root-provider.ts`
- `packages/c420ui/src/host-dependency-runner.ts`
- `packages/c420ui/src/host-dependencies.ts`
- `packages/c420ui/src/artifacts.ts`
- `packages/c420ui/src/workflow-runner.ts`
- `packages/c420ui/src/development-provider.ts`
- `packages/c420ui/src/detection.ts`
- `packages/c420ui/src/terminal/`
- `packages/c420ui/host/linux/sudo-helper.sh`

## Consumed configs and adapters

c420ui consumes project data through the bridge and provider interfaces. For
Canva Linux, those interfaces are implemented by `scripts/c420ui-adapter/` and
load configuration from `config/canva-linux/`.

The c420ui package must not import `scripts/c420ui-adapter/`,
`scripts/canva-linux/`, or `config/canva-linux/`.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run check:shared-tooling`
- `npm run docs:check-ai`

These checks protect the package boundary, project-specific string boundary,
root-provider boundary, artifact recipe validation, and public API exports.

## Forbidden regressions

- Do not hardcode Canva Linux metadata inside `packages/c420ui/src`.
- Do not publish or document c420ui as an external npm package in this release.
- Do not migrate c420ui to ESM in this release line.
- Do not reintroduce `scripts/c420ui/` or move terminal UI out of
  `packages/c420ui/src/terminal/`.
- Do not bypass the Action Engine for terminal or direct CLI actions.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.
