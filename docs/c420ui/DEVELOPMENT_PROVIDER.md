# c420ui Development Provider

The c420ui Development Provider exposes project development tasks as generic
workflows. It allows terminal and CLI tooling to display and run project tasks
without making c420ui project-specific.

## Controls

- Generic development-task config shape.
- Conversion of development tasks into c420ui workflow descriptors.
- Consistency between task metadata and the referenced action.
- Planned development task reporting.

## Must not control

- Concrete Canva Linux build, validation, package, or release commands.
- Runtime build script internals.
- Release publication or package target implementation.

## Implementing files

- `packages/c420ui/src/development-provider.ts`
- `packages/c420ui/src/workflows.ts`
- `packages/c420ui/src/workflow-runner.ts`
- `scripts/c420ui-adapter/development.ts`
- `config/canva-linux/development.json`

## Consumed configs and adapters

Canva Linux declares development tasks in `config/canva-linux/development.json`.
Each task points to an action declared in `config/canva-linux/actions.json` and
is loaded by `scripts/c420ui-adapter/development.ts`.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm test`

## Forbidden regressions

- Do not hardcode Canva Linux development commands in `packages/c420ui/src`.
- Do not report planned development tasks as executable success.
- Do not allow development-task scope or root metadata to contradict its action.
- Do not bypass the Action Engine when running development workflows.
