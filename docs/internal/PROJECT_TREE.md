# Internal Project Tree

The documentation tree is split by ownership:

```text
docs/
  c420ui/       Generic c420ui architecture and engine documentation.
  canva-linux/ Canva Linux dependent-project documentation.
  internal/    AI guardrails, validation policy, maintenance history, and boundary rules.
```

Runtime and tooling ownership remains split:

```text
packages/c420ui/           Generic c420ui source and host helpers.
scripts/c420ui-adapter/    Canva Linux adapter bridge into c420ui.
scripts/canva-linux/       Canva Linux project-specific tooling.
config/canva-linux/        Canva Linux action, dependency, development, artifact, and UI declarations.
electron/                  Canva Linux Electron runtime.
```

Do not move concrete build scripts or runtime source as part of documentation-only release preparation.
