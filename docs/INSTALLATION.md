# Installation

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
CANVA_DEBUG=1 canva-linux
CANVA_DEBUG=2 canva-linux
CANVA_FORCE_WAYLAND=1 canva-linux
CANVA_FORCE_X11=1 canva-linux
CANVA_GPU_BACKEND=auto canva-linux
CANVA_GPU_BACKEND=opengl canva-linux
CANVA_GPU_BACKEND=vulkan canva-linux
CANVA_GPU_BACKEND=software canva-linux
```

### Flatpak Install

```bash
flatpak run io.github.coletivo420.canva-linux
CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
CANVA_DEBUG=2 flatpak run io.github.coletivo420.canva-linux
CANVA_FORCE_WAYLAND=1 flatpak run io.github.coletivo420.canva-linux
CANVA_FORCE_X11=1 flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=auto flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=opengl flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=vulkan flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=software flatpak run io.github.coletivo420.canva-linux
```

### AppImage

```bash
./dist/<artifact>.AppImage
CANVA_DEBUG=1 ./dist/<artifact>.AppImage
CANVA_DEBUG=2 ./dist/<artifact>.AppImage
CANVA_FORCE_WAYLAND=1 ./dist/<artifact>.AppImage
CANVA_FORCE_X11=1 ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=auto ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=opengl ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=vulkan ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=software ./dist/<artifact>.AppImage
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
- `CANVA_DEBUG=1`
- `CANVA_DEBUG=2`
- `CANVA_FORCE_WAYLAND=1`
- `CANVA_FORCE_X11=1`
- `CANVA_GPU_BACKEND=auto|opengl|vulkan|software`
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

Canva Linux may use project phase labels such as `0.1.4.11-dev.29`.

Package metadata consumed by npm, electron-builder and future Linux package targets must use valid SemVer: `0.1.4-dev.11.29`.

Do not use four numeric version segments in `package.json#version`.

Invalid: `0.1.4.11-dev.29`
Valid: `0.1.4-dev.11.29`

Native Install, Flatpak Install and AppImage share the same runtime behavior. Differences are limited to sandbox model, install paths and launch command.
