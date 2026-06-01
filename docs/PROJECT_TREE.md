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
build-resources/           Project-owned build resources root.
build-resources/c420ui/           Generic c420ui package source and Linux host helper.
build-resources/electron/         Canva Linux Electron runtime and preload source.
build-resources/canva-linux/assets/ Canonical Canva Linux desktop, metainfo, and icon assets.
build-resources/canva-linux/c420ui-adapter/    Canva Linux project adapter for c420ui.
build-resources/canva-linux/checks/core/              Repository-wide validation and infrastructure checks.
build-resources/canva-linux/config/        Canva Linux project declarations for actions, artifacts, dependencies, development, and UI.
build-resources/canva-linux/validation/    Canva Linux project-specific validation policies.
build-resources/tests/                      TypeScript-first unit, wiring, and smoke tests.
packaging/                 Packaging submission workspaces (e.g., Flathub).
assets/                    Repository documentation assets.
```

Generic c420ui code must not hardcode Canva Linux metadata. Canva Linux code must not reimplement c420ui Action Engine, Command Runner, Root Provider, host dependency, or artifact workflow policy.

`build-resources/` is the canonical home for project-owned runtime/build resources. Root `packages/`, `electron/`, `data/`, and loose icon assets must not be restored.
