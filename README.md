# Canva Linux

A community-maintained open-source desktop wrapper for use with Canva.

## Quick Start

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh --doctor
```

### Native Install

```bash
./canva-linux.sh --install-native
```

Native Install uses system scope by default and installs Canva Linux under `/opt/canva-linux`.

To install only for the current user:

```bash
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

Native Install runs outside the Flatpak sandbox and follows XDG/FHS-style paths for desktop integration and user-data cleanup.

### Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

Flatpak Install builds and installs the sandboxed Flatpak package.

### AppImage package

```bash
./canva-linux.sh --bundle-appimage
```

AppImage packaging is experimental in this development line. It creates a portable artifact under `dist/` and runs outside the Flatpak sandbox.

Some systems require FUSE support to run AppImage artifacts. See [AppImage FUSE Requirements](docs/APPIMAGE_FUSE.md).

## Usage

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

## Management Script

| Command | Description |
| --- | --- |
| `--install-native` | Run Native Install. |
| `--install-flatpak` | Build and install the Flatpak package locally. |
| `--bundle-flatpak` | Create a distributable `.flatpak` package. |
| `--bundle-appimage` | Create an experimental AppImage package. |
| `--build-runtime` | Build the compiled Electron runtime. |
| `--build-dir` | Build `dist/linux-unpacked`. |
| `--validate-appimage` | Validate generated AppImage artifacts. |
| `--doctor` | Check host tools. |
| `--clean` | Remove generated build/package artifacts. |
| `--validate` | Run full project validation. |
| `--uninstall` | Detect and remove installed variants. |
| `--purge` | Uninstall and remove user data. |

## Documentation

- [Installation](docs/INSTALLATION.md)
- [Documentation Index](docs/README.md)
- [Validation](docs/VALIDATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Technical Notes](docs/TECHNICAL.md)
- [AppImage FUSE Requirements](docs/APPIMAGE_FUSE.md)
- [TypeScript](docs/TYPESCRIPT.md)
- [CL-EyeDropper](docs/CANVA_LINUX_EYEDROPPER.md)
- [Flatpak & Flathub Packaging](docs/FLATHUB.md)

Project website: https://coletivo420.github.io/canva-linux/

## Interactive menu

Run without arguments to open the interactive menu:

```bash
./canva-linux.sh
```

The menu is organized into:

- Install
- Development
- Maintenance & Uninstall
- Show detected installs/artifacts
