# Canva Linux

A community-maintained open-source desktop wrapper for use with Canva.

## Quick Start

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh
```

Running `./canva-linux.sh` opens the Canva Linux Terminal Assistant when the terminal supports it.
On first launch, the assistant may install Node development dependencies and build the TUI bundle automatically.

## Canva Linux Terminal Assistant

The default workflow is the Blessed-based Terminal Assistant:

```bash
./canva-linux.sh
```

Guided sections include Native/Flatpak install, package generation, validation, doctor checks, cleanup and uninstall workflows.

```bash
./canva-linux.sh --tui
./canva-linux.sh --no-tui
CANVA_NO_TUI=1 ./canva-linux.sh
CANVA_SKIP_NPM_INSTALL=1 ./canva-linux.sh
```

Direct commands remain available and do not open the TUI:

```bash
./canva-linux.sh --doctor
./canva-linux.sh --bundle-appimage
```

## Shared Action Registry

Canva Linux uses a shared workflow registry:

```text
scripts/actions.json
```

The Terminal Assistant, shell fallback menu and direct CLI flags resolve actions through this file. Backend implementations remain in `scripts/`.

## Installation options

### Native Install

```bash
./canva-linux.sh --install-native
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

### Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

## Package generation

```bash
./canva-linux.sh --bundle-flatpak
./canva-linux.sh --bundle-appimage
./canva-linux.sh --prepare-aur
./canva-linux.sh --bundle-deb
./canva-linux.sh --bundle-rpm
```

## Runtime usage

```bash
canva-linux
flatpak run io.github.coletivo420.canva-linux
./dist/<artifact>.AppImage
```

## Management / direct CLI commands

All direct commands are resolved through `scripts/actions.json`.

| Command | Description |
| --- | --- |
| `--tui` | Force Blessed TUI assistant. |
| `--no-tui` | Force shell fallback menu. |
| `--install-native` | Run Native Install. |
| `--install-flatpak` | Build and install Flatpak locally. |
| `--bundle-flatpak` | Create distributable `.flatpak`. |
| `--bundle-appimage` | Create AppImage package. |
| `--prepare-aur` | Planned for `0.1.4.12-dev.1`. |
| `--bundle-deb` | Planned after AUR stabilization. |
| `--bundle-rpm` | Planned after AUR stabilization. |
| `--build-runtime` | Build compiled Electron runtime. |
| `--build-dir` | Build `dist/linux-unpacked`. |
| `--validate` | Run project validation. |
| `--validate-appimage` | Validate AppImage artifacts. |
| `--validate-appimage-extract` | Validate AppImage + extraction checks. |
| `--doctor` | Check host tools. |
| `--clean` | Remove generated artifacts. |
| `--uninstall` | Detect and uninstall variants. |
| `--uninstall-native` | Uninstall Native variant. |
| `--uninstall-flatpak` | Uninstall Flatpak variant. |
| `--reset-user-data` | Remove user data only. |
| `--purge` | Uninstall + remove user data. |

## Documentation links

- [Installation](docs/INSTALLATION.md)
- [Documentation Index](docs/README.md)
- [Validation](docs/VALIDATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Technical Notes](docs/TECHNICAL.md)
- [AppImage FUSE Requirements](docs/APPIMAGE_FUSE.md)
