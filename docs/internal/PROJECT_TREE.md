# Internal Project Tree

The documentation tree is split by ownership. This is an internal maintenance
map for humans and AI agents.

## Documentation tree

```text
docs/
  c420ui/       Generic c420ui architecture and engine documentation.
  canva-linux/ Canva Linux dependent-project documentation.
  internal/    AI guardrails, validation policy, history, and boundary rules.
```

`docs/c420ui/` documents reusable engine behavior. It must not describe Canva
Linux runtime behavior as c420ui-owned behavior.

`docs/canva-linux/` documents project-specific Canva Linux behavior. It must
make clear that c420ui is the engine and Canva Linux is the dependent project.

`docs/internal/` may keep historical notes, guardrails, inventories, and
validation policy. Internal docs still use English.

## Runtime and tooling tree

```text
packages/c420ui/           Generic c420ui source and Linux host helper.
scripts/c420ui-adapter/    Canva Linux adapter bridge into c420ui.
scripts/canva-linux/       Canva Linux project-specific tooling.
config/canva-linux/        Canva Linux declarations.
electron/                  Canva Linux Electron runtime.
data/                      Desktop and AppStream metadata.
```

## Config ownership

- `config/canva-linux/actions.json`: Canva Linux action declarations.
- `config/canva-linux/project-ui.json`: project header and identity metadata.
- `config/canva-linux/development.json`: development task declarations.
- `config/canva-linux/dependencies.json`: dependency declarations only.
- `config/canva-linux/artifacts.json`: artifact recipe declarations only.

## Boundary rules

- c420ui owns Action Engine, Command Runner, Root Provider, host dependency
  policy, development provider, artifact recipe validation, workflow runner, and
  terminal UI.
- Canva Linux owns Electron runtime, OAuth behavior, runtime debug flags, package
  recipes, metadata, and project config.
- Canva Linux launchers do not run dependency installation directly.
- Canva Linux does not validate generic artifact recipes.
- The adapter does not duplicate Action Engine policy.
- `scripts/preflight-common.sh` is repository-check-only.

## Version and release line

- Current version: `0.1.4-14`.
- Required version format: `N.N.N-X`.
- Do not use `0.1.4-dev.14`, `0.1.4-rc.14`, or `0.1.4.14`.

## Do not move in this release-prep work

- Do not move concrete package scripts into c420ui.
- Do not move Electron runtime files.
- Do not move project config back to old `scripts/` locations.
- Do not reintroduce `scripts/c420ui/`.
- Do not create generated JavaScript outside `.build/`, `dist/`, `coverage`, or
  dependency output.
