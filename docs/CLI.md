# CLI Commands

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](c420ui/BUILDER_ALIAS.md).

The `canva-linux-c420ui-builder` command is the **Canva Linux Builder powered by c420ui**.
It provides access to the c420ui terminal interface and direct CLI actions.

## Usage

```bash
./canva-linux-c420ui-builder [action] [options]
```

- If no action is provided, the c420ui terminal interface starts.
- If an action flag is provided, the builder delegates it to the c420ui CLI bridge.
- The builder only parses global builder flags. It does not maintain its own action allowlist.
- Direct CLI actions are resolved by the c420ui CLI bridge from the project Action Registry.
- Direct CLI actions are routed through the c420ui CLI bridge and the c420ui Action Engine.
- The builder command rebuilds the c420ui CLI bridge when relevant TypeScript sources, project adapter files or
  action registry metadata are newer than `.build/scripts/run-c420ui-cli.js`.
- The builder does not decide whether an action is concrete, planned, or invalid; the Action Registry and Action Engine own that policy.
- Do not run Canva Linux Builder powered by c420ui as root. When an operation needs administrator privileges,
  Canva Linux asks for authentication only for that specific action.

## Global Options

| Option | Description |
| --- | --- |
| `-y, --yes` | Skip confirmation prompts for dangerous actions (uninstall, purge, etc.). |
| `--force` | Alias for `--yes`. |
| `-h, --help` | Show usage information. |
| `--dry-run` | Resolve direct action metadata without executing command scripts. |

`./canva-linux-c420ui-builder --help` is stable builder command help. The compiled bridge help
(`node .build/scripts/run-c420ui-cli.js --help`) is dynamic and lists the
action flags exposed by the active project bridge.

The current direct CLI accepts flag-only global options. Options that take values
must be added deliberately to the generic parser before use.

## Actions

Direct actions are resolved through the shared Action Registry (`config/canva-linux/actions.json`)
by the c420ui CLI bridge; the builder command does not maintain a separate executable
action flag list.
Planned actions are shown in c420ui so users can see future packaging targets,
but they are not executable. Running a planned action without `--dry-run` exits
with code `78`; `--dry-run` only resolves metadata and still exits `0`.

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

## Root and Scope Enforcement

The c420ui Action Engine enforces Action Registry metadata before starting a
backend script. Actions with `requiresRoot: true` validate administrator access
through `packages/c420ui/host/linux/sudo-helper.sh --validate`; direct CLI mode uses the c420ui CLI
bridge, while c420ui uses previously cached credentials in non-interactive mode.

`scope: "user"` actions must not require root, and the Action Engine refuses an
action that combines user scope with `requiresRoot: true`. User-scope Native and
Flatpak actions receive their `CANVA_NATIVE_SCOPE=user` or
`CANVA_FLATPAK_SCOPE=user` environment from the Action Registry and do not ask
for sudo.

`--uninstall` and `--purge` are conditional: they only validate root access when
a system-wide Native or Flatpak installation is detected.

## Environment Variables

The c420ui and scripts honor the following environment variables:

| Variable | Description |
| --- | --- |
| `CANVA_FLATPAK_SCOPE` | Set to `system` (default) or `user` for Flatpak actions. |
| `CANVA_NATIVE_SCOPE` | Set to `system` (default) or `user` for Native actions. |
| `CANVA_TOOL_SESSION_LOG` | Path to the tool session log file. |

## Builder Settings

Application Settings are persistent c420ui state, not shell actions. They are stored
in `$XDG_CONFIG_HOME/canva-linux/tool-settings.json`, or
`~/.config/canva-linux/tool-settings.json` when `XDG_CONFIG_HOME` is unset.

Current builder settings:

- `Enable general logs for Canva Linux Builder powered by c420ui`: shows
  Builder-level startup, settings, detection and authentication events in the c420ui
  logs panel. Action logs remain visible either way, and critical builder warnings
  or errors still appear when general builder logs are disabled.
- `Manual text selection mode`: disables c420ui mouse capture globally so the terminal
  can perform native text selection while keyboard navigation remains active.
  Changes take effect immediately and are saved for the next c420ui start.
  Keyboard log scrolling and F5 copy remain available. F6 opens a plain logs
  view with the session log path as a fallback for manual selection.

## Compiled Runtime CLI

The compiled `canva-linux` Electron app owns runtime flags. The `./canva-linux-c420ui-builder` c420ui
public builder alias does not own or implement app runtime debug flags.

```bash
canva-linux --help
canva-linux --version
canva-linux --canva-debug=1
canva-linux --canva-debug=2
canva-linux --credential-store=auto
canva-linux --credential-store=gnome-libsecret
canva-linux --credential-store=kwallet6
canva-linux --credential-store=kwallet5
canva-linux --gpu-backend=auto
canva-linux --gpu-backend=opengl
canva-linux --gpu-backend=vulkan
canva-linux --gpu-backend=software
canva-linux --gpu-backend=force
canva-linux --force-x11
canva-linux --force-wayland
canva-linux --disable-wayland-color-manager
```

Runtime diagnostics are exposed through the compiled Canva Linux CLI only. Use `--canva-debug=1` or `--canva-debug=2` for diagnostics,
and use `--credential-store=...` for credential-store selection.

Do not use `--debug`. It is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
Use `--canva-debug=1` or `--canva-debug=2`.

Flatpak examples:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
flatpak run io.github.coletivo420.canva-linux \
  --canva-debug=2 \
  --gpu-backend=software \
  --force-wayland \
  --disable-wayland-color-manager
```



Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance,
and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.
