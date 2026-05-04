# Installation

## Installation modes

| Mode | Scope | Sandbox | Default |
| --- | --- | --- | --- |
| Native Install | system/user | No Flatpak sandbox | system |
| Flatpak Install | system/user | Flatpak sandbox | system |

## Native Install

```bash
./canva-linux.sh --install-native
```

Native Install uses system scope by default.

System scope installs to:

- `/opt/canva-linux`
- `/usr/local/bin/canva-linux`
- `/usr/local/share/applications`

To install only for the current user:

```bash
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

User scope installs to:

- `~/.local/opt/canva-linux`
- `~/.local/bin/canva-linux`
- `~/.local/share/applications`

Security note: Native Install runs outside the Flatpak sandbox.

## Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

Flatpak Install builds and installs the sandboxed Flatpak package.

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

## Package generation

```bash
./canva-linux.sh --bundle-flatpak
```

Planned package targets: AppImage, `.deb`, `.rpm`, and AUR/PKGBUILD.

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

AppImage is a portable package and does not use the Flatpak sandbox.
Run: `./Canva-Linux-<version>.AppImage`

deb/rpm packages install Canva Linux as a native system package and run outside the Flatpak sandbox.
Run: `canva-linux`

AUR/PKGBUILD builds a native Arch package and runs outside the Flatpak sandbox after installation.

## Uninstall

```bash
./canva-linux.sh --uninstall
```

## Purge

```bash
./canva-linux.sh --purge
```
