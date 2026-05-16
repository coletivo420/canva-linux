# Canva Linux

Status: **Alpha**
Version: **0.1.4-15.Dev.2**
Release target: **v0.1.4-15.Dev.2**
License: **GPL-3.0-or-later**

Independent community project. Not affiliated with Canva.

Canva Linux is an open-source Linux desktop wrapper and maintenance toolkit for using Canva with native Linux-oriented integration,
packaging, diagnostics, and development workflows.

It provides a dedicated desktop wrapper, Linux integration, packaging and validation tooling, and community-maintained workflows for
users, contributors, and automation. Canva Linux is not official Canva software.

## Feature Matrix

| Area | Status | Features |
| --- | --- | --- |
| Desktop wrapper | Available | Dedicated Electron window, persistent Canva session, desktop integration |
| Session storage | Available | Secret Service-backed persistent login with ephemeral fallback |
| Editor integration | Available | Internal tabs, OAuth popup handling, upload/export flows |
| Color tools | Available | CL-EyeDropper integration |
| Diagnostics | Available | GPU diagnostics, browser capture diagnostics, upload diagnostics |
| Packaging | Available / Experimental | Flatpak packaging, native install workflows, experimental AppImage |
| Development tooling | Available | TypeScript-first maintained tooling, runtime build, validation, doctor checks, package recipes |
| Dependency checks | Available | Host dependency validation, declared vs installed npm dependency checks |
| Artifact validation | Available | Artifact recipe validation, AppStream metadata checks, RC validation matrix |
| **c420ui workspace** | Available | Terminal UI, c420ui Action Engine, progress/log panels, root-auth popup for privileged actions |
| Maintenance | Available | Uninstall, purge, reset user data, permissions recovery |
| Planned packages | Planned | AUR/PKGBUILD, `.deb`, `.rpm` |

TypeScript-first maintained tooling is part of the project contract, with JavaScript treated as generated runtime/build output.

## Quick Start

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh
```

The launcher opens the c420ui terminal interface by default. Direct CLI flags are available for automation.

Run Canva Linux as a regular user. Privileged actions request administrator authentication only when needed.

## Usage

```bash
./canva-linux.sh --help
./canva-linux.sh --doctor --dry-run
./canva-linux.sh --bundle-appimage --dry-run
./canva-linux.sh --bundle-flatpak --dry-run
./canva-linux.sh --purge --yes --dry-run
```

Dry-run commands report planned work without intentionally changing installed packages, bundles, credentials, runtime data, or user
configuration. Packaging commands depend on the required host tooling being installed for the target environment.

## Canva Linux Documentation

- [Documentation index](docs/README.md)
- [Installation](docs/INSTALLATION.md)
- [CLI reference](docs/CLI.md)
- [Features](docs/FEATURES.md)
- [Debugging](docs/DEBUGGING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [AppImage FUSE requirements](docs/APPIMAGE_FUSE.md)
- [Validation](docs/VALIDATION.md)
- [Release guide](docs/RELEASE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Technical architecture](docs/TECHNICAL.md)
- [TypeScript notes](docs/TYPESCRIPT.md)
- [CL EyeDropper architecture](docs/CANVA_LINUX_EYEDROPPER.md)

### Canva Linux internals

- [Architecture](docs/canva-linux/ARCHITECTURE.md)
- [CLI](docs/canva-linux/CLI.md)
- [Configuration](docs/canva-linux/CONFIG.md)
- [Packaging](docs/canva-linux/PACKAGING.md)
- [AppImage](docs/canva-linux/APPIMAGE.md)
- [Flatpak](docs/canva-linux/FLATPAK.md)
- [Release](docs/canva-linux/RELEASE.md)
- [Credential storage](docs/canva-linux/CREDENTIAL_STORAGE.md)

## Architecture Overview

Canva Linux owns:

- Electron runtime
- Canva integration
- packaging recipes
- release metadata
- desktop/AppStream metadata
- project configuration

c420ui owns generic terminal/action orchestration. `scripts/c420ui-adapter/` connects Canva Linux configuration to c420ui, and
`config/canva-linux/` contains project declarations for actions, artifacts, dependencies, development tasks, and UI metadata.

## Release and Packaging

Current release target: `0.1.4-15.Dev.2`.

Versioning format for this bugfix cycle: `N.N.N-X.Dev.Y`.

Artifact names preserve generated architecture strings such as `x86_64` and `X86_64`. Do not normalize architecture names to `x64`.

- [Canva Linux packaging](docs/canva-linux/PACKAGING.md)
- [Canva Linux release](docs/canva-linux/RELEASE.md)
- [RC validation matrix](docs/internal/RC_VALIDATION_MATRIX.md)

## Security and Privacy

Canva Linux is not official Canva software. Review the code, packaging recipes, and privileged workflows before running them in a
sensitive environment.

Persistent login depends on Linux native credential storage and available safeStorage encryption.
KDE/Plasma tries KWallet first, then the alternate KWallet generation, then Secret Service/libsecret.
GNOME and unknown desktops try Secret Service/libsecret first, then KWallet compatibility paths.
Without secure storage, session behavior can be ephemeral, and `basic_text` is never treated as persistent.

Root actions are isolated to explicit install and maintenance workflows. Administrator credentials must never be logged.

## Contributing

Issues and pull requests are welcome.

Maintained code, comments, documentation, and changelog entries must be in English. Future translations require explicit i18n
architecture.

## About c420ui

c420ui is the generic terminal UI and action orchestration engine used by Canva Linux. It owns the Action Engine, Command Runner,
Root Provider, host dependency checks, artifact workflow runner, and terminal interface. Canva Linux consumes it through project
configuration and `scripts/c420ui-adapter/`.

- [c420ui architecture](docs/c420ui/ARCHITECTURE.md)
- [Action Engine](docs/c420ui/ACTION_ENGINE.md)
- [Command Runner](docs/c420ui/COMMAND_RUNNER.md)
- [Root Provider](docs/c420ui/ROOT_PROVIDER.md)
- [Host Dependencies](docs/c420ui/HOST_DEPENDENCIES.md)
- [Development Provider](docs/c420ui/DEVELOPMENT_PROVIDER.md)
- [Artifact Workflows](docs/c420ui/ARTIFACTS.md)
- [Terminal UI](docs/c420ui/TERMINAL_UI.md)
