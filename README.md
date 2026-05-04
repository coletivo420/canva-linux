# Canva Linux

A community-maintained open source desktop wrapper for use with Canva.

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

Native Install runs outside the Flatpak sandbox.

### Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

Flatpak Install builds and installs the sandboxed Flatpak package.

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

## Management Script

| Command | Description |
| --- | --- |
| `--install-native` | Run Native Install. |
| `--install-flatpak` | Build and install the Flatpak package locally. |
| `--bundle-flatpak` | Create a distributable `.flatpak` package. |
| `--build-runtime` | Build the compiled Electron runtime. |
| `--build-dir` | Build `dist/linux-unpacked`. |
| `--doctor` | Check host tools. |
| `--clean` | Remove generated build/package artifacts. |
| `--validate` | Run full project validation. |
| `--uninstall` | Detect and remove installed variants. |
| `--purge` | Uninstall and remove user data. |
