# CLI Commands

The `canva-linux.sh` launcher provides access to the Terminal Assistant (TUI) and direct CLI actions.

## Usage

```bash
./canva-linux.sh [action] [options]
```

- If no action is provided, the Terminal Assistant (TUI) starts.
- If an action flag is provided, the command is executed directly.

## Global Options

| Option | Description |
| --- | --- |
| `-y, --yes` | Skip confirmation prompts for dangerous actions (uninstall, purge, etc.). |
| `-h, --help` | Show usage information. |

## Actions

Direct actions are resolved through the shared Action Registry (`scripts/actions.json`).

| Command | Description |
| --- | --- |
| `--install-native` | Run Native Install. |
| `--install-flatpak` | Build and install Flatpak locally. |
| `--install` | Compatibility alias for `--install-flatpak`. |
| `--bundle-flatpak` | Create distributable `.flatpak` package. |
| `--bundle` | Compatibility alias for `--bundle-flatpak`. |
| `--bundle-appimage` | Create experimental AppImage package. |
| `--prepare-aur` | Planned for `0.1.4.12-dev.1`. |
| `--bundle-deb` | Planned after AUR stabilization. |
| `--bundle-rpm` | Planned after AUR stabilization. |
| `--build-runtime` | Build compiled Electron runtime. |
| `--build-dir` | Build `dist/linux-unpacked`. |
| `--validate` | Run full project validation. |
| `--validate-appimage` | Validate generated AppImage artifacts. |
| `--validate-appimage-extract` | Validate AppImage artifacts with optional extraction check. |
| `--doctor` | Check host tools. |
| `--clean` | Remove generated build/package artifacts. |
| `--uninstall` | Detect and uninstall installed Native/Flatpak variants. |
| `--uninstall-native` | Uninstall Native Install. |
| `--uninstall-flatpak` | Uninstall Flatpak Install. |
| `--reset-user-data` | Delete login/session/cache data. |
| `--purge` | Uninstall detected variants and remove user data. |

## Environment Variables

The TUI and scripts honor the following environment variables:

| Variable | Description |
| --- | --- |
| `CANVA_FLATPAK_SCOPE` | Set to `system` (default) or `user` for Flatpak actions. |
| `CANVA_NATIVE_SCOPE` | Set to `system` (default) or `user` for Native actions. |
| `CANVA_TOOL_SESSION_LOG` | Path to the tool session log file. |
| `CANVA_DEBUG` | Set to `1` or `2` for verbose Electron runtime diagnostics. |
