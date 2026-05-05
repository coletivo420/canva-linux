# Canva Linux

A community-maintained open-source desktop wrapper for use with Canva.

Current release line: **0.1.4.11 (Alpha)** / phase **0.1.4.11-dev.49**.

## Quick Start

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh
```

Running `./canva-linux.sh` opens the Canva Linux Terminal Assistant when the terminal supports it.
On first launch, the assistant may install Node development dependencies and build the TUI bundle automatically.

## Canva Linux Terminal Assistant

The default workflow is the Blessed-based Terminal Assistant for Canva Linux — Install and Development Tool:

```bash
./canva-linux.sh
```

Guided sections include Native/Flatpak install, package generation, validation, doctor checks, cleanup and uninstall workflows.

The Terminal Assistant uses a Canva-inspired terminal theme with light blue, blue and purple accents. The selected menu item is highlighted for keyboard navigation.

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

## Command reference

See [docs/CLI.md](docs/CLI.md) for direct flags, examples and environment variables.

## Documentation links

- [Installation](docs/INSTALLATION.md)
- [Documentation Index](docs/README.md)
- [Validation](docs/VALIDATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Technical Notes](docs/TECHNICAL.md)
- [AppImage FUSE Requirements](docs/APPIMAGE_FUSE.md)
- [TypeScript](docs/TYPESCRIPT.md)
- [CL-EyeDropper](docs/CANVA_LINUX_EYEDROPPER.md)
- [AI Guardrails](docs/AI_GUARDRAILS.md)


## TUI and Shell Tool switching

Inside the Terminal Assistant: `F4 -> Use Shell Tool`.

Inside the Shell Tool: choose `Use TUI Tool` in the main menu.

### Automatic status overview

The Overview panel automatically shows package/version info, phase, release notes and detected Native/Flatpak/AppImage state. Manual detection actions are hidden from normal workflows.

### Logs and clipboard

The TUI includes a larger native-scrollable log panel.

Shortcuts: `PageUp`/`PageDown`, `Home`/`End`, `F5` copy logs to clipboard.
Clipboard preference order: `wl-copy`, KDE Klipper (`qdbus6`/`qdbus`), GPaste, `xclip`, `xsel`.
