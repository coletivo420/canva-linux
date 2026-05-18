# Canva Linux

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](docs/c420ui/BUILDER_ALIAS.md).

**Canva Linux Builder powered by c420ui** is the official builder and installer entrypoint:
`./canva-linux-c420ui-builder`. The compiled runtime app remains `canva-linux`.

Status: **Alpha**
Version: **0.1.4-15.Dev.8**
Release target: **v0.1.4-15.Dev.8**
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
./canva-linux-c420ui-builder
```

The builder command opens the c420ui terminal interface by default. Direct CLI flags are available for automation.

Run Canva Linux as a regular user. Privileged actions request administrator authentication only when needed.

## Usage

```bash
./canva-linux-c420ui-builder --help
./canva-linux-c420ui-builder --doctor --dry-run
./canva-linux-c420ui-builder --bundle-appimage --dry-run
./canva-linux-c420ui-builder --bundle-flatpak --dry-run
./canva-linux-c420ui-builder --purge --yes --dry-run
```

Dry-run commands report planned work without intentionally changing installed packages, bundles, credentials, runtime data, or user
configuration. Packaging commands depend on the required host tooling being installed for the target environment.

## Runtime CLI

The compiled Canva Linux app owns runtime flags. The public builder alias
(`./canva-linux-c420ui-builder`) does not implement app runtime debug flags.

```bash
canva-linux --help
canva-linux --version
canva-linux --canva-debug=1
canva-linux --canva-debug=2
canva-linux --credential-store=auto
canva-linux --credential-store=gnome-libsecret
canva-linux --credential-store=kwallet6
canva-linux --credential-store=kwallet5
```

Runtime diagnostics are exposed through the compiled Canva Linux CLI only. Use `--canva-debug=1` or `--canva-debug=2` on the runtime command
instead of environment fallbacks.

Do not use `--debug`. It is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
Use `--canva-debug=1` or `--canva-debug=2`.

Flatpak examples:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
flatpak run io.github.coletivo420.canva-linux \
  --canva-debug=2 \
  --gpu-backend=software \
  --force-wayland \
  --disable-wayland-color-manager
```


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

Current release target: `0.1.4-15.Dev.8`.

Dev.6 is the post-migration cleanup handoff for dead-code auditing, obsolete validation-contract cleanup, streamlined smoke tests,
runtime CLI diagnostics cleanup, and GPU/display `runtime-options` logging. It preserves active behavior boundaries, including
`--option=value` runtime CLI parsing, so the next functional phase can focus on OAuth reload work without reopening cleanup scope.

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


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance,
and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.

## Build metadata and OAuth context

Canva Linux keeps the source base version at `0.1.4-15.Dev.8` and generates an effective build version with
`+g<short-hash>` for runtime logs, `--version`, manifests, and artifacts. See `docs/VERSIONING.md` for the
source/effective version contract.

After OAuth completes, the source tab preserves its current Canva context on the first reload. Canonical home navigation
is used only as a post-load fallback when a localized public logged-out landing page is detected.
