# CLI Commands

The `canva-linux.sh` launcher provides access to the Terminal Assistant (C420UI) and direct CLI actions.

## Usage

```bash
./canva-linux.sh [action] [options]
```

- If no action is provided, the Terminal Assistant (C420UI) starts.
- If an action flag is provided, the command is executed directly.
- Do not run the Tool as root. When an operation needs administrator privileges,
  Canva Linux asks for authentication only for that specific action.

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
| `--bundle-flatpak` | Create distributable `.flatpak` package. |
| `--bundle-appimage` | Create experimental AppImage package. |
| `--prepare-aur` | Planned for a later packaging line. |
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

The C420UI and scripts honor the following environment variables:

| Variable | Description |
| --- | --- |
| `CANVA_FLATPAK_SCOPE` | Set to `system` (default) or `user` for Flatpak actions. |
| `CANVA_NATIVE_SCOPE` | Set to `system` (default) or `user` for Native actions. |
| `CANVA_TOOL_SESSION_LOG` | Path to the tool session log file. |
| `CANVA_DEBUG` | Set to `1` or `2` for verbose Electron runtime diagnostics. |

## Tool Settings

Application Settings are persistent C420UI state, not shell actions. They are stored
in `$XDG_CONFIG_HOME/canva-linux/tool-settings.json`, or
`~/.config/canva-linux/tool-settings.json` when `XDG_CONFIG_HOME` is unset.

Current Tool settings:

- `Enable general logs for Canva Linux Install and Development Tool`: shows
  Tool-level startup, settings, detection and authentication events in the C420UI
  logs panel. Action logs remain visible either way, and critical Tool warnings
  or errors still appear when general Tool logs are disabled.
- `Prefer native terminal text selection on next C420UI start`: when enabled before
  startup, disables C420UI mouse handling globally for the session so the terminal
  can perform native text selection. Changes take effect on the next C420UI start.
  Keyboard log scrolling and F5 copy remain available. F6 opens a plain logs
  view with the session log path as a fallback for manual selection.
