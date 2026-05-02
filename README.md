# Canva Linux - Flatpak + Electron

A community-maintained open source desktop wrapper for use with Canva.

[Website](https://coletivo420.github.io/canva-linux/) | [GitHub](https://github.com/coletivo420/canva-linux)

---

## Status: Alpha

Canva Linux is currently in **alpha**. It provides a Linux desktop wrapper around Canva with persistent sessions, internal tabs, OAuth handling, and system integration.

> **Disclaimer:** Canva Linux is an independent community project and is not published, verified, endorsed, certified, or officially supported by Canva Pty Ltd.

---

## Features

- **Persistent Sessions:** Stay logged in across restarts.
- **Internal Tabs:** Manage multiple designs within a single window.
- **OAuth Support:** Secure login via Google, Facebook, and more.
- **Custom EyeDropper:** Integrated color picker that works on Linux.
- **Wayland & X11:** Full support for modern display servers.
- **GPU Acceleration:** High-performance rendering enabled by default.

---

## Quick Start

The canonical way to manage Canva Linux is via the `./canva-linux.sh` script.

### Installation (Local Build)

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
./canva-linux.sh --install
```

### Usage

```bash
# Run the installed Flatpak
flatpak run io.github.coletivo420.canva-linux

# Or run directly from the build directory (development)
./canva-linux.sh --run-dev
```

---

## Management Script

The `./canva-linux.sh` script provides all common development and maintenance tasks:

| Command | Description |
| --- | --- |
| `--run-dev` | Build and run without installing. |
| `--install` | Build and install locally via Flatpak. |
| `--bundle` | Generate a distributable `.flatpak` bundle. |
| `--validate` | Run full project validation (lint, tests, etc). |
| `--uninstall` | Remove the local Flatpak installation. |
| `--reset-user-data` | Clear app cache, sessions, and login state. |

---

## Debugging

If you encounter issues, you can enable debug logs:

```bash
# Level 1: Internal diagnostics
CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux

# Level 2: Verbose Electron/Chromium logs
CANVA_DEBUG=2 flatpak run io.github.coletivo420.canva-linux
```

Logs are stored in `logs/current.log` within the application's data directory.

---

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- [Features & Roadmap](docs/FEATURES.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Debugging & Logs](docs/DEBUGGING.md)
- [GPU Acceleration](docs/GPU_ACCELERATION.md)
- [Flatpak & Flathub Packaging](docs/FLATHUB.md)
- [Technical Architecture](docs/TECHNICAL.md)
- [Privacy Policy](docs/PRIVACY.md)

---

## License

Distributed under the **GNU General Public License v3.0 or later**. See [LICENSE](LICENSE) for details.

---

## Migration Note

If you have older versions installed:

```bash
flatpak uninstall com.canva.Linux
flatpak uninstall io.github.PirateMaryRead.canva-linux
```
