# Technical Notes

This document summarizes the current Canva Linux runtime, build and packaging architecture.

## Runtime architecture

Canva Linux is an Electron desktop wrapper around Canva.

Core runtime files:

- `electron/main/index.ts` - Electron shell entrypoint and composition root.
- `electron/main/runtime.ts` - Linux runtime setup, shared session configuration and storage flushing.
- `electron/main/lifecycle.ts` - startup and shutdown lifecycle wiring.
- `electron/main/ipc.ts` - centralized main-process IPC routing.
- `electron/main/logging.ts` - status output, startup diagnostics and credential-storage diagnostics.
- `electron/main/oauth.ts` - OAuth popup lifecycle and callback tracking.
- `electron/main/shell.ts` - top-level window and toolbar shell helpers.
- `electron/main/tab-controller.ts` - tab creation and orchestration.
- `electron/main/tab-events.ts` - per-tab `webContents` policy and event wiring.
- `electron/main/tabs.ts` - tab ordering, selection, closing and layout helpers.
- `electron/main/eyedropper-bridge.ts` - scoped tab snapshot bridge for CL-EyeDropper.
- `electron/preload/canva.ts` - source Canva page preload entrypoint.
- `electron/preload/canva.bundle.js` - generated preload bundle; do not edit directly.
- `electron/preload/custom-eyedropper-flow.ts` - snapshot capture and CL-EyeDropper lifecycle.
- `electron/preload/native-eyedropper-wrapper.ts` - Canva-facing EyeDropper replacement layer.
- `electron/preload/cl-eyedropper/*.ts` - TypeScript CL-EyeDropper implementation and contracts.
- `electron/shared/debug.ts` - shared debug parsing and log gating.
- `electron/shared/navigation.ts` - shared Canva/OAuth URL classification.

## CL-EyeDropper policy

Canva Linux uses CL-EyeDropper as its only supported custom colorpicker implementation.

The result contract remains:

```ts
{ sRGBHex: "#rrggbb" }
```

The eyedropper snapshot IPC bridge only captures the tab whose renderer sent the request; it does not fall back to the active tab.

## Build pipeline

The runtime build is intentionally split:

1. `tsc` compiles Electron runtime source into `.build/`.
2. esbuild bundles the preload entrypoint into `canva.bundle.js`.
3. electron-builder packages `.build/`.
4. Packaging scripts consume the generated Electron output.

Commands:

```bash
npm run build:preload
npm run build:runtime
npm run build:check
```

Preload bundling modes:

- Source mode: `npm run build:preload` bundles `electron/preload/canva.ts` into `electron/preload/canva.bundle.js`.
- Build-output mode: `npm run build:runtime` compiles `electron/**/*.ts` into `.build/electron/**/*.js`, then bundles `.build/electron/preload/canva.js` into `.build/electron/preload/canva.bundle.js`.

The preload bundle output remains CommonJS for Electron compatibility.

## Package factory workflow

`canva-linux.sh` is the canonical Linux workflow command for build, install, package, validation and uninstall operations.

Current install/package commands:

```bash
./canva-linux.sh --install-native
./canva-linux.sh --install-flatpak
./canva-linux.sh --bundle-flatpak
./canva-linux.sh --bundle-appimage
./canva-linux.sh --build-runtime
./canva-linux.sh --build-dir
./canva-linux.sh --doctor
./canva-linux.sh --clean
./canva-linux.sh --uninstall
./canva-linux.sh --purge
```

Planned package commands:

```bash
./canva-linux.sh --bundle-deb
./canva-linux.sh --bundle-rpm
./canva-linux.sh --prepare-aur
```

## Native Install

Native Install runs outside the Flatpak sandbox.

Native Install scopes:

| Scope | App files | Launcher | Desktop/icon integration |
| --- | --- | --- | --- |
| system | `/opt/canva-linux` | `/usr/local/bin/canva-linux` | `/usr/local/share` |
| user | `~/.local/opt/canva-linux` | `~/.local/bin/canva-linux` | `~/.local/share` |

Native Install user-data cleanup is XDG-aware and checks:

- `${XDG_CONFIG_HOME:-~/.config}`
- `${XDG_CACHE_HOME:-~/.cache}`
- `${XDG_DATA_HOME:-~/.local/share}`
- `${XDG_STATE_HOME:-~/.local/state}`

## Flatpak Install

Flatpak Install runs inside the Flatpak sandbox and uses the active AppID:

```text
io.github.coletivo420.canva-linux
```

Flatpak scopes are controlled with:

```bash
CANVA_FLATPAK_SCOPE=system
CANVA_FLATPAK_SCOPE=user
```

## AppImage package

AppImage packaging is experimental in this development line.

Command:

```bash
./canva-linux.sh --bundle-appimage
```

Implementation:

- `npm run dist:appimage`
- `scripts/build-appimage.sh`
- electron-builder target: `AppImage`
- artifact name: `canva-linux-${version}-${arch}.AppImage`

AppImage artifacts run outside the Flatpak sandbox and may require FUSE support depending on the distribution.

AppImage packaging and AppImage execution are separate concerns:

- `./canva-linux.sh --bundle-appimage` generates the artifact.
- `./canva-linux.sh --validate-appimage` validates generated files.
- Running the AppImage may require host FUSE support.

See `docs/APPIMAGE_FUSE.md`.

## Debug output

Debug output is centralized in `electron/main/logging.ts` and mirrored into the per-start `current.log` file under Electron user data.

Public debug levels:

```bash
CANVA_DEBUG=1
CANVA_DEBUG=2
```

Display backend checks:

```bash
CANVA_FORCE_WAYLAND=1
CANVA_FORCE_X11=1
```

GPU backend checks:

```bash
CANVA_GPU_BACKEND=auto
CANVA_GPU_BACKEND=opengl
CANVA_GPU_BACKEND=vulkan
CANVA_GPU_BACKEND=software
```

## Workflow notes

- Native Install and AppImage are not sandboxed by Flatpak.
- Flatpak Install is sandboxed by Flatpak.
- `.flatpak` bundle generation is intended for distributable artifacts.
- AppImage generation is currently experimental.
- AUR/PKGBUILD is planned as the first new package target after AppImage hardening.
- `.deb` and `.rpm` packaging remain planned for later phases.
- Generated outputs such as `.build/`, `dist/`, `build-dir/`, `repo/`, and `.flatpak-builder/` must not be committed.


## Versioning policy

Canva Linux may use project phase labels such as `0.1.4.11-dev.29`.

Package metadata consumed by npm, electron-builder and future Linux package targets must use valid SemVer: `0.1.4-dev.11.29`.

Do not use four numeric version segments in `package.json#version`.

Invalid: `0.1.4.11-dev.29`
Valid: `0.1.4-dev.11.29`


## Shared installer architecture

Installer scripts are split into common helpers:

- `app-identity-common.sh`
- `xdg-common.sh`
- `install-layout-common.sh`
- `desktop-integration-common.sh`
- `runtime-guidance-common.sh`
- `user-data-common.sh`

Format-specific scripts should be thin adapters.

## Shared installer core

`canva-linux.sh` is a visual workflow router. Shared behavior lives in:

- `ui-common.sh`
- `app-identity-common.sh`
- `xdg-common.sh`
- `install-layout-common.sh`
- `desktop-integration-common.sh`
- `runtime-guidance-common.sh`
- `user-data-common.sh`
- `install-detection-common.sh`

## Installer UI

`canva-linux.sh` uses `scripts/ui-common.sh` for colored terminal output.

The UI must respect:

- `NO_COLOR`
- `TERM=dumb`
- non-TTY output

All interactive shell scripts should use `ui-common.sh` for user-facing messages.

## Runtime behavior parity

Native Install, Flatpak Install and AppImage must share the same Electron runtime behavior.

Packaging-specific differences are limited to sandbox model, install paths, launch command and host integration.


## Detection model

The installer distinguishes installed variants from generated artifacts:

- Native Install system/user
- Flatpak Install system/user
- AppImage artifacts under `dist/*.AppImage`

AppImage artifacts are generated files, not installed variants. Use `--clean` to remove generated artifacts.


## AppImage artifact policy

AppImage is currently experimental.

The build workflow removes old AppImage artifacts before generating a new one. A successful build should leave:

- one canonical `dist/*.AppImage`;
- `dist/SHA256SUMS`.

AppImage artifacts are generated package files, not installed variants. They are reported by installation detection for visibility, but they are removed by `--clean`, not by `--uninstall`.
