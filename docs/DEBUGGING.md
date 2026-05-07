# Debugging

Canva Linux writes diagnostics to a single central log file:

```text
logs/current.log
```

## Debug levels

### `CANVA_DEBUG=1`

Shows all internal Canva Linux diagnostics:

```bash
CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
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

### `CANVA_DEBUG=2`

Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron stderr logs:

```bash
CANVA_DEBUG=2 flatpak run io.github.coletivo420.canva-linux
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

## No module-specific debug selection

Canva Linux no longer supports selecting debug modules from the command line.

Unsupported examples:

- `CANVA_DEBUG=gpu`
- `CANVA_DEBUG=oauth`
- `CANVA_DEBUG=dnd`
- `CANVA_DEBUG=eyedropper`
- `CANVA_DEBUG=tabs`
- `CANVA_DEBUG=toolbar`
- `CANVA_DEBUG=permissions`

Use `CANVA_DEBUG=1` for all internal Canva Linux diagnostics.

Use `CANVA_DEBUG=2` for all internal diagnostics plus Chromium/Electron verbose logs.

## Credential storage diagnostics

At startup, Canva Linux logs the selected credential storage backend and the resulting session policy.

Expected secure examples:

- `kwallet`
- `kwallet5`
- `kwallet6`
- `gnome_libsecret`

Insecure fallback:

- `basic_text`

When `basic_text` is detected, Canva Linux starts in ephemeral session mode. In ephemeral mode, login state, cookies and credentials are not preserved after the app closes. Logs must not contain cookies, tokens, passwords or credential material.

## GPU diagnostics

GPU diagnostics are included in `CANVA_DEBUG=1`.

Expected entries:

- `launcher-report vendor=`
- `runtime-env backend=`
- `feature-status acceleration=`

## GPU backend checks

```bash
CANVA_GPU_BACKEND=auto CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=opengl CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=vulkan CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
CANVA_GPU_BACKEND=software CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
```

## Display backend checks

```bash
CANVA_FORCE_WAYLAND=1 CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
CANVA_FORCE_X11=1 CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux
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
CANVA_DISABLE_WAYLAND_COLOR_MANAGER=1 flatpak run io.github.coletivo420.canva-linux
```

## Google One Tap / FedCM warning

Canva may emit a `[GSI_LOGGER]` warning from `static.canva.com` about Google One Tap prompt UI status methods and FedCM migration.

This warning is emitted by Canva/Google Identity Services page code, not by Canva Linux. Canva Linux must not monkeypatch Google Identity Services APIs to silence it.

Treat it as an upstream compatibility warning unless Google login stops working. With `CANVA_DEBUG=1`, known warnings from `static.canva.com` are classified as upstream FedCM warnings while preserving the original console log.

## Build dependency bootstrap troubleshooting

If runtime build fails with missing npm modules such as `esbuild`, repair the workspace with:

```bash
npm ci --include=dev
./canva-linux.sh --build-runtime
```

To force a clean reinstall during installer flows:

```bash
CANVA_NPM_REPAIR=clean ./canva-linux.sh --install-native
```
