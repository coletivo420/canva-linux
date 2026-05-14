# Canva Linux

Status: **Alpha**
Version: **0.1.4-14 (Alpha)**
Release: **v0.1.4-14**

Independent community project. Not affiliated with Canva.

## What is Canva Linux?

Canva Linux is an open-source desktop wrapper and tooling project for running Canva with Linux-oriented integration, packaging,
diagnostics, and maintenance workflows.

## Quick Start

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh
```

The launcher opens the c420ui terminal interface by default. Direct CLI action flags are available for automation.
Both surfaces route through the same c420ui Action Engine.

Run the tool as your regular user. Privileged operations ask for administrator authentication only when the selected action needs it.

## Architecture at a glance

- Canva Linux owns the Electron runtime, Canva integration, packaging recipes, release metadata, and project configuration.
- c420ui owns the generic terminal UI, Action Engine, Command Runner, Root Provider, host dependency runner, and artifact workflow runner.
- `scripts/c420ui-adapter/` is the Canva Linux adapter layer between project configuration and generic c420ui contracts.
- `config/canva-linux/` contains project action, artifact, dependency, development, and UI declarations.
- Release asset names preserve upstream/tooling architecture strings such as `x86_64` or `X86_64`.

Maintained Node.js tooling is TypeScript. JavaScript appears only as generated output, while shell remains reserved for Linux host-operation glue.

## Feature Matrix

- **Desktop app**: dedicated window, Secret Service-backed persistent session, ephemeral fallback, desktop integration.
- **Editor**: CL-EyeDropper, upload/export flows, OAuth popup, internal tabs.
- **System**: Native Install, Flatpak Install, experimental AppImage.
- **Development**: runtime build, package generation, validation, doctor checks.
- **c420ui workspace**: guided sections, logs, progress bar, root-auth popup for privileged actions.
- **Maintenance**: uninstall, purge, reset user data, permissions recovery.
- **Diagnostics**: GPU, upload, browser capture diagnostics.
- **Planned package targets**: AUR/PKGBUILD, then `.deb` and `.rpm`.

## Documentation

Start with the [documentation index](docs/README.md) for the full map.

### Users and operators

- [Installation](docs/INSTALLATION.md)
- [CLI reference](docs/CLI.md)
- [Features](docs/FEATURES.md)
- [Debugging](docs/DEBUGGING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [AppImage FUSE requirements](docs/APPIMAGE_FUSE.md)

### Contributors and release maintainers

- [Validation checklist](docs/VALIDATION.md)
- [Release guide](docs/RELEASE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Project tree reference](docs/PROJECT_TREE.md)
- [Technical architecture](docs/TECHNICAL.md)
- [TypeScript notes](docs/TYPESCRIPT.md)
- [CL EyeDropper architecture](docs/CANVA_LINUX_EYEDROPPER.md)

### Split architecture references

- [c420ui architecture](docs/c420ui/ARCHITECTURE.md)
- [c420ui Action Engine](docs/c420ui/ACTION_ENGINE.md)
- [c420ui Command Runner](docs/c420ui/COMMAND_RUNNER.md)
- [c420ui Root Provider](docs/c420ui/ROOT_PROVIDER.md)
- [c420ui host dependencies](docs/c420ui/HOST_DEPENDENCIES.md)
- [c420ui development provider](docs/c420ui/DEVELOPMENT_PROVIDER.md)
- [c420ui artifact workflows](docs/c420ui/ARTIFACTS.md)
- [c420ui terminal UI](docs/c420ui/TERMINAL_UI.md)
- [Canva Linux architecture](docs/canva-linux/ARCHITECTURE.md)
- [Canva Linux CLI](docs/canva-linux/CLI.md)
- [Canva Linux config](docs/canva-linux/CONFIG.md)
- [Canva Linux packaging](docs/canva-linux/PACKAGING.md)
- [Canva Linux AppImage](docs/canva-linux/APPIMAGE.md)
- [Canva Linux Flatpak](docs/canva-linux/FLATPAK.md)
- [Canva Linux release](docs/canva-linux/RELEASE.md)
- [Canva Linux credential storage](docs/canva-linux/CREDENTIAL_STORAGE.md)

## Security and privacy notes

Use only trusted build/dependency sources and review privileged actions before execution. Persistent login requires a secure Linux Secret Service backend.
Otherwise, Canva Linux uses ephemeral session mode.

## Limitations

Some packaging targets are planned and depend on host tooling availability.

## Contributing

Issues and pull requests are welcome.

## License

GPL-3.0
