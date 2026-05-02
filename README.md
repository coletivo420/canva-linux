# Canva Linux - Flatpak + Electron

A community-maintained open source desktop wrapper for use with Canva.

---

## Status: Alpha

Canva Linux is currently in **alpha**. It provides a Linux desktop wrapper around Canva with persistent sessions, internal tabs, OAuth handling, and system integration.

> **Disclaimer:** Canva Linux is an independent community project and is not published, verified, endorsed, certified, or officially supported by Canva Pty Ltd.

---

## Features

- **Persistent sessions:** Stay logged in across restarts. Canva Linux uses Electron/Chromium persistent session storage and can integrate with the desktop secret storage available on the system, such as KWallet, GNOME Keyring/libsecret, or compatible Secret Service providers, when available.
- **Flatpak support:** Local install, development runs, validation and bundle generation through `./canva-linux.sh`.
- **OAuth support:** Google login and other provider popups are handled through a dedicated OAuth popup flow.
- **CL-EyeDropper:** Custom Canva Linux EyeDropper integration for reliable color picking inside the Canva editor.
- **GPU diagnostics:** Optional GPU/debug diagnostics through `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.
- **Upload/export compatibility:** File import, upload and download/export workflows are preserved through Flatpak-friendly permissions and portal-aware behavior.
- **Wayland/X11 support:** Designed for modern Wayland sessions with X11 fallback support.

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

- [Documentation Index](docs/README.md)
- [Validation](docs/VALIDATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [TypeScript](docs/TYPESCRIPT.md)
- [CL-EyeDropper](docs/CANVA_LINUX_EYEDROPPER.md)
- [AI Maintenance Notes](docs/AI_GUARDRAILS.md)
- [Flatpak & Flathub Packaging](docs/FLATHUB.md)

Project website: https://coletivo420.github.io/canva-linux/

---

## License

Distributed under the **GNU General Public License v3.0 or later**. See [LICENSE](LICENSE) for details.
