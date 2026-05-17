# Debugging

Canva Linux writes diagnostics to a single central log file:

```text
logs/current.log
```

## Debug levels

### `canva-linux --canva-debug=1`

Shows all internal Canva Linux diagnostics:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

Includes:

- startup
- session
- app lifecycle
- tabs
- toolbar
- views
- permissions
- uploads
- OAuth
- drag-and-drop
- eyedropper
- preload
- GPU acceleration monitoring

### `canva-linux --canva-debug=2`

Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron stderr logs:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
```

Use this mode when debugging:

- Chromium startup
- Electron internals
- Wayland/X11 behavior
- GPU process behavior
- DBus warnings
- sandbox warnings
- compositor issues
- media/capture internals

## Reserved Electron/Node debug flag

Do not use `--debug`. It is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments. Use `--canva-debug=1` or `--canva-debug=2`.

## No module-specific debug selection

Canva Linux no longer supports selecting debug modules from the command line.

Unsupported examples:

- `--debug=gpu`
- `--debug=oauth`
- `--debug=dnd`
- `--debug=eyedropper`
- `--debug=tabs`
- `--debug=toolbar`
- `--debug=permissions`

Use `canva-linux --canva-debug=1` for all internal Canva Linux diagnostics.

Use `canva-linux --canva-debug=2` for all internal diagnostics plus Chromium/Electron verbose logs.

## Credential storage diagnostics

At startup, Canva Linux logs the selected credential storage backend, whether
`safeStorage.isEncryptionAvailable()` could be verified as available, and the resulting session policy.

Expected secure backend examples, when encryption is also available:

- `kwallet`
- `kwallet5`
- `kwallet6`
- `gnome_libsecret`

Insecure fallback:

- `basic_text`

Persistent login requires both a secure backend name and `isEncryptionAvailable=true`. When `basic_text` is detected,
the backend is unknown, detection fails, or a secure backend reports unavailable encryption, Canva Linux starts in ephemeral session mode.
In ephemeral mode, login state, cookies and credentials are not preserved after the app closes.
Logs must not contain cookies, tokens, passwords or credential material.

## GPU diagnostics

GPU diagnostics are included in `canva-linux --canva-debug=1`.

Expected entries:

- `launcher-report vendor=`
- `runtime-env backend=`
- `feature-status acceleration=`

## GPU backend checks

```bash
flatpak run io.github.coletivo420.canva-linux --gpu-backend=auto --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=opengl --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=vulkan --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --gpu-backend=software --canva-debug=1
```

## Display backend checks

```bash
flatpak run io.github.coletivo420.canva-linux --force-wayland --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --force-x11 --canva-debug=1
```

## Post-install terminal guidance

After a successful local Flatpak install, the installer prints a compact command reference.

When stdout is an interactive terminal, section titles and commands are color-highlighted.

Colors are disabled automatically when:

- stdout is not a TTY;
- `NO_COLOR` is set;
- `TERM=dumb`.

This keeps CI logs and redirected output clean.

## Wayland color-management workaround

For NVIDIA/KDE/Wayland color-manager warnings:

```bash
flatpak run io.github.coletivo420.canva-linux --disable-wayland-color-manager
```

## Google One Tap / FedCM warning

Canva may emit a `[GSI_LOGGER]` warning from `static.canva.com` about Google One Tap prompt UI status methods and FedCM migration.

This warning is emitted by Canva/Google Identity Services page code, not by Canva Linux. Canva Linux must not monkeypatch Google Identity Services APIs to silence it.

Treat it as an upstream compatibility warning unless Google login stops working. With `canva-linux --canva-debug=1`, known warnings from `static.canva.com` are classified as upstream FedCM warnings while preserving the original console log.

## Build dependency bootstrap troubleshooting

If runtime build fails with missing npm modules such as `esbuild`, repair the workspace with:

```bash
npm ci --include=dev
./canva-linux-c420ui-builder --build-runtime
```

To force a clean reinstall during installer flows:

```bash
C420UI_DEPENDENCY_REPAIR=clean ./canva-linux-c420ui-builder --install-native
```
