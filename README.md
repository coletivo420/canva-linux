# Canva Linux

Status: **Alpha**
Version: **0.1.4-12 (Alpha)**
Release: **v0.1.4-12**

Independent community project. Not affiliated with Canva.

## What is Canva Linux?
Canva Linux is an open-source desktop wrapper/tooling project for running Canva
with Linux-oriented integration, packaging, diagnostics, and maintenance workflows.

## Quick Start
```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh
```

## Canva Linux Install and Development Tool
The launcher opens the C420UI terminal interface by default (when supported), with Install,
Development, and Maintenance workflows. Direct CLI action flags are available for
automation.

Run the Tool as your regular user. Privileged operations ask for administrator
authentication only when the selected action needs it.

Maintained Node.js tooling is TypeScript. JavaScript appears only as generated
output, while shell remains reserved for Linux host-operation glue.

## Feature Matrix
- **Desktop App**: dedicated window, persistent session, desktop integration.
- **Editor**: CL-EyeDropper, upload/export flows, OAuth popup, internal tabs.
- **System**: Native Install, Flatpak Install, experimental AppImage.
- **Development**: runtime build, package generation, validation, doctor checks.
- **C420UI workspace**: guided sections, logs, progress bar, root-auth popup for privileged actions.
- **Maintenance**: uninstall, purge, reset user data, permissions recovery.
- **Diagnostics**: GPU, upload, browser capture diagnostics.
- **Future**: AUR/PKGBUILD, then `.deb`/`.rpm`.

## Desktop Integration
Native and Flatpak flows provide desktop entry integration for Linux environments.

## Editor Compatibility
Project includes compatibility layers for Canva editor workflows, including EyeDropper and OAuth handling.

## Packaging and Install Modes
Supports scoped system/user install modes for Native and Flatpak, plus package artifact workflows.

## Diagnostics and Maintenance
Includes doctor checks, validation pipeline, cleanup, uninstall and purge workflows.

## Documentation
- [Requirements / Install Instructions](docs/INSTALLATION.md#requirements--install-instructions)
- [CLI Reference](docs/CLI.md)
- [Features](docs/FEATURES.md)
- [Debugging](docs/DEBUGGING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Validation](docs/VALIDATION.md)
- [Release](docs/RELEASE.md)
- [Development](docs/DEVELOPMENT.md)
- [AI Guardrails](docs/AI_GUARDRAILS.md)
- [Project README (docs)](docs/README.md)
- [TypeScript Notes](docs/TYPESCRIPT.md)
- [CL EyeDropper](docs/CANVA_LINUX_EYEDROPPER.md)

## Security / Privacy Notes
Use only trusted build/dependency sources and review privileged actions before execution.

## Limitations
Some packaging targets remain planned and may depend on host tooling availability.

## Contributing
Issues and pull requests are welcome.

## License
GPL-3.0
