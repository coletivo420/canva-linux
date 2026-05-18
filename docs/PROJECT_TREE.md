# Project Tree Reference

The repository is organized around a stable split between the generic c420ui engine, the Canva Linux dependent project, and internal maintenance policy.

## Documentation

```text
docs/
  c420ui/       Generic c420ui architecture, engines, providers, artifacts, and terminal UI.
  canva-linux/ Canva Linux dependent-project architecture, CLI, config, packaging, release, and credential storage.
  internal/    Guardrails, validation policy, project tree notes, development history, and repository inventory.
```

## Runtime and tooling

```text
packages/c420ui/           Generic c420ui package source and Linux host helper.
scripts/c420ui-adapter/    Canva Linux project adapter for c420ui.
scripts/canva-linux/       Canva Linux project-specific actions and support tooling.
scripts/core/              Repository-wide validation and infrastructure checks.
config/canva-linux/        Canva Linux project declarations for actions, artifacts, dependencies, development, and UI.
electron/                  Canva Linux Electron runtime and preload source.
test/                      TypeScript-first unit, wiring, and smoke tests.
packaging/                 Packaging submission workspaces (e.g., Flathub).
data/                      Desktop and AppStream metadata.
build-resources/           Packaging icons and builder resources.
assets/                    Repository documentation assets.
```

Generic c420ui code must not hardcode Canva Linux metadata. Canva Linux code must not reimplement c420ui Action Engine, Command Runner, Root Provider, host dependency, or artifact workflow policy.
