# Installation

## Requirements / Install Instructions

Install support varies by Linux distribution. Use the platform guidance below before selecting the installation mode:

- Native Install and Flatpak Install are the primary supported flows for day-to-day use.
- AppImage packaging is experimental in this development phase and may require additional host setup (for example FUSE support).
- If your distribution-specific setup is missing dependencies, complete the required host tooling from the Development guide before running install commands.

See also:

- [Development guide (host dependencies)](DEVELOPMENT.md#requirements)
- [AppImage FUSE requirements](APPIMAGE_FUSE.md)

## Credential storage requirements

Persistent login requires a working Linux Secret Service backend.

Examples:

- KDE Plasma: KWallet / KWallet 5 / KWallet 6
- GNOME: GNOME Keyring / libsecret
- XFCE, Cinnamon, Pantheon and compatible desktops: libsecret-compatible Secret Service provider

Electron backend names expected for secure persistent login include `kwallet`, `kwallet5`, `kwallet6`, and `gnome_libsecret`.

If no secure backend is available, Electron reports `basic_text`, or `safeStorage.isEncryptionAvailable()` is false
because the keyring/wallet is unavailable, locked, or cancelled, Canva Linux uses an ephemeral session.
Login, cookies and credentials will not be saved.

## Installation modes

| Mode | Scope | Sandbox | Default |
| --- | --- | --- | --- |
| Native Install | system/user | No Flatpak sandbox | system |
| Flatpak Install | system/user | Flatpak sandbox | system |
| AppImage | portable artifact | No Flatpak sandbox | manual run |

## Native Install

```bash
./canva-linux.sh --install-native
```

Native Install uses system scope by default.

System scope installs to:

- `/opt/canva-linux`
- `/usr/local/bin/canva-linux`
- `/usr/local/share/applications`
- `/usr/local/share/icons/hicolor`

To install only for the current user:

```bash
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

User scope installs to:

- `~/.local/opt/canva-linux`
- `~/.local/bin/canva-linux`
- `~/.local/share/applications`
- `~/.local/share/icons/hicolor`

Security note: Native Install runs outside the Flatpak sandbox.

Native Install, AppImage, future deb/rpm and AUR follow XDG/FHS-style host paths.
Flatpak Install follows Flatpak sandbox paths and stores data under `~/.var/app/<APP_ID>`.

Native user data cleanup is XDG-aware. Purge/removal checks the configured XDG homes when available and falls back to standard locations:

- `${XDG_CONFIG_HOME:-~/.config}`
- `${XDG_CACHE_HOME:-~/.cache}`
- `${XDG_DATA_HOME:-~/.local/share}`
- `${XDG_STATE_HOME:-~/.local/state}`

## Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

Flatpak Install builds and installs the sandboxed Flatpak package.

To install only for the current user:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install-flatpak
```

## AppImage package

```bash
./canva-linux.sh --bundle-appimage
./canva-linux.sh --validate-appimage
./canva-linux.sh --validate-appimage-extract
```

AppImage packaging is experimental in this development line. It creates a portable artifact under `dist/` using electron-builder.

AppImage generation can take several minutes depending on system performance and compression time.

AppImage artifacts are not installed by default. They are portable package files generated under `dist/`.

AppImage does not use the Flatpak sandbox. Depending on the distribution, running AppImage files may require FUSE support.

Some systems require FUSE support to run AppImage artifacts. If the AppImage does not start, check:

```bash
command -v fusermount3 || command -v fusermount || true
```

See [AppImage FUSE Requirements](APPIMAGE_FUSE.md).

## Runtime commands

### Native Install

```bash
canva-linux
canva-linux --debug=1
canva-linux --debug=2
canva-linux --force-wayland
canva-linux --force-x11
canva-linux --gpu-backend=auto
canva-linux --gpu-backend=opengl
canva-linux --gpu-backend=vulkan
canva-linux --gpu-backend=software
```

### Flatpak Install

```bash
flatpak run io.github.coletivo420.canva-linux
flatpak run io.github.coletivo420.canva-linux --debug=1
flatpak run io.github.coletivo420.canva-linux --debug=2
flatpak run io.github.coletivo420.canva-linux --force-wayland
flatpak run io.github.coletivo420.canva-linux --force-x11
flatpak run io.github.coletivo420.canva-linux --gpu-backend=auto
flatpak run io.github.coletivo420.canva-linux --gpu-backend=opengl
flatpak run io.github.coletivo420.canva-linux --gpu-backend=vulkan
flatpak run io.github.coletivo420.canva-linux --gpu-backend=software
```

### AppImage

```bash
./dist/<artifact>.AppImage
./dist/<artifact>.AppImage --debug=1
./dist/<artifact>.AppImage --debug=2
./dist/<artifact>.AppImage --force-wayland
./dist/<artifact>.AppImage --force-x11
./dist/<artifact>.AppImage --gpu-backend=auto
./dist/<artifact>.AppImage --gpu-backend=opengl
./dist/<artifact>.AppImage --gpu-backend=vulkan
./dist/<artifact>.AppImage --gpu-backend=software
```

## Package generation

```bash
./canva-linux.sh --bundle-flatpak
./canva-linux.sh --bundle-appimage
./canva-linux.sh --validate-appimage
./canva-linux.sh --validate-appimage-extract
```

Planned package targets:

- AUR / PKGBUILD
- `.deb`
- `.rpm`

## Planned package post-install guidance

Future package formats should use the same diagnostic command structure:

- Run command
- `canva-linux --debug=1`
- `canva-linux --debug=2`
- `--force-wayland`
- `--force-x11`
- `--gpu-backend=auto|opengl|vulkan|software`
- Sandbox/security note
- Uninstall command

`.deb` and `.rpm` packages install Canva Linux as a native system package and run outside the Flatpak sandbox.

AUR/PKGBUILD builds a native Arch package and runs outside the Flatpak sandbox after installation.

AppImage artifacts are portable generated files. They are not removed by `--uninstall`; use `--clean` to remove generated package artifacts.

## Uninstall

```bash
./canva-linux.sh --uninstall
```

## Purge

```bash
./canva-linux.sh --purge
```


## Versioning policy

Canva Linux uses npm SemVer-compatible project phase labels such as `0.1.4-14`.

Package metadata consumed by npm, electron-builder and future Linux package targets must use valid SemVer, for example `0.1.4-14` for release `v0.1.4-14`.

Do not use four numeric version segments in `package.json#version`.

Invalid: four numeric version segments
Valid: `0.1.4-14`

Native Install, Flatpak Install and AppImage share the same runtime behavior. Differences are limited to sandbox model, install paths and launch command.
