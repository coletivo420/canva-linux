# Technical Notes

## Workflow architecture

## Runtime architecture

Canva Linux is an Electron desktop wrapper around Canva.

Core runtime files:

- `electron/main/index.ts` - Electron shell entrypoint and composition root.
- `electron/main/runtime.ts` - Linux runtime setup and shared session configuration.
- `electron/main/lifecycle.ts` - startup and shutdown lifecycle wiring.
- `electron/main/ipc.ts` - centralized main-process IPC routing.
- `electron/main/logging.ts` - status output and startup diagnostics.
- `electron/main/oauth.ts` - OAuth popup lifecycle and callback tracking.
- `electron/main/shell.ts` - top-level window and toolbar shell helpers.
- `electron/main/tab-controller.ts` - tab creation and orchestration.
- `electron/main/tab-events.ts` - per-tab `webContents` policy and event wiring.
- `electron/main/tabs.ts` - tab ordering, selection, closing and layout helpers.
- `electron/main/eyedropper-bridge.ts` - scoped tab snapshot bridge for CL-EyeDropper.
- `electron/preload/canva.ts` - source Canva page preload entrypoint.
- `electron/preload/custom-eyedropper-flow.ts` - snapshot capture and CL-EyeDropper lifecycle.
- `electron/preload/native-eyedropper-wrapper.ts` - Canva-facing EyeDropper replacement layer.
- `electron/preload/cl-eyedropper/*.ts` - CL-EyeDropper TypeScript implementation.
- `electron/shared/debug.ts` - shared debug parsing and log gating.
- `electron/shared/navigation.ts` - shared Canva/OAuth URL classification.

Canva Linux workflow actions are split into four layers:

1. `scripts/actions.json` (canonical registry)
2. `scripts/action-runner.js` (action resolution/execution)
3. Interfaces (Blessed TUI, shell fallback, direct CLI flags)
4. Backend scripts under `scripts/`

## Terminal Assistant / Blessed TUI

`./canva-linux.sh` opens the Blessed TUI by default when stdin/stdout are TTY, `TERM` is not `dumb`, Node.js/npm are available, and `CANVA_NO_TUI` is not set.

The TUI is a visual assistant over shared backend actions; it does not duplicate install/package logic.

## TUI process and log handling

The TUI runner streams stdout/stderr separately, decodes UTF-8 safely, buffers partial lines, preserves empty lines, highlights stderr, blocks navigation while running, asks confirmation for destructive actions, and sends SIGINT first on cancellation.

## Packaging roadmap notes

- `prepare-aur` is planned for `0.1.4.12-dev.1`.
- `.deb`/`.rpm` remain planned after AUR stabilization.
