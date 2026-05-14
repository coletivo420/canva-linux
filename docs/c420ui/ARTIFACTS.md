# c420ui Artifact Workflows

c420ui owns generic artifact recipe contracts and workflow execution. Canva Linux
owns concrete AppImage, Flatpak, tarball, checksum, and planned package recipes.

## Controls

- The `c420uiArtifactRecipeWorkflow` config type.
- Artifact recipe validation.
- Workflow phase routing for build, validate, install, package, and release
  flows.
- Planned/executable consistency checks.
- `requiresRoot` and `scope` consistency checks.
- `outputPattern` validation with `${version}` expansion.

## Must not control

- Concrete Canva Linux shell scripts or package recipes.
- AppImage, Flatpak, tarball, checksum, `.deb`, `.rpm`, or AUR implementation.
- Generated release artifact names beyond validating recipe contracts.

## Recipe requirements

Each artifact recipe must declare a scope. Recipes use `outputPattern` with
`${version}` so generated names follow the npm package version. Recipes must not
contain hardcoded architecture normalizations.

Forbidden recipe patterns include:

- `x64` when it replaces generated `x86_64` or `X86_64` artifact naming.
- `${arch}` placeholders in output patterns.
- Executable workflows pointing at planned actions.
- Planned workflows pointing at executable actions.
- `requiresRoot=true` with user-scope actions.
- System workflows backed by non-root system actions.

## Implementing files

- `packages/c420ui/src/artifacts.ts`
- `packages/c420ui/src/workflow-runner.ts`
- `packages/c420ui/src/workflows.ts`
- `scripts/c420ui-adapter/artifacts.ts`
- `config/canva-linux/artifacts.json`

## Consumed configs and adapters

Canva Linux declares recipes in `config/canva-linux/artifacts.json`. The adapter
loads them through `scripts/c420ui-adapter/artifacts.ts` and c420ui validates the
generic recipe shape before workflows are exposed.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm test`
- `./scripts/validate-project.sh`

## Forbidden regressions

- Do not normalize `x86_64` or `X86_64` to `x64` in release artifact names.
- Do not introduce `${arch}` into artifact output patterns.
- Do not make planned DEB/RPM/AUR workflows execute as real package builds.
- Do not move Canva Linux package recipes into c420ui core.
- Do not bypass the Action Engine or Root Provider for artifact actions.
