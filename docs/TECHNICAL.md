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
2. `scripts/core/action-runner.ts` (action resolution/execution, compiled to `.build/scripts/core/action-runner.js`)
3. Interfaces (Blessed TUI and direct CLI flags)
4. Backend scripts under `scripts/`

## Terminal Assistant / Blessed TUI

`./canva-linux.sh` opens the Blessed TUI by default when stdin/stdout are TTY, `TERM` is not `dumb`, and Node.js/npm are available. Legacy interface selection flags and environment variables have been removed.

The TUI is a visual assistant over shared backend actions; it does not duplicate install/package logic. It provides guided sections, log monitoring, and a progress bar.

## Sudo Contract

Privileged actions follow a shared contract defined in `scripts/sudo-common.sh`.

1. Actions with `requiresRoot: true` in `scripts/actions.json` are identified by the TUI.
2. The TUI requests root password via a secure prompt before starting the action.
3. The TUI validates the password and then passes `CANVA_TUI_ROOT_AUTH=1` to the child process.
4. `scripts/sudo-common.sh` detects this environment variable and uses `sudo -n` for non-interactive execution.
5. In direct CLI mode, `sudo` prompts for the password as usual in the terminal.

## TypeScript Script Core

The project validations and contracts are implemented in TypeScript under `scripts/core/`. These are compiled into `.build/scripts/core/` and executed through `scripts/run-core-entry.sh`. All project validations are integrated into the `npm run check:scripts-core` quality gate.

## Packaging roadmap notes

- `prepare-aur` is planned for `0.1.4.12-dev.1`.
- `.deb`/`.rpm` remain planned after AUR stabilization.


## Terminal theme

The Blessed TUI and direct CLI output use a shared Canva-inspired visual language.

Reference palette:
- Light Blue: `#07B9CE`
- Blue: `#3969E7`
- Purple: `#7D2AE7`

The TUI uses `scripts/tui/theme.ts`.
Direct CLI output uses ANSI-safe approximations through `scripts/ui-common.sh`.

The theme must remain readable with:
- truecolor terminals;
- xterm-256color;
- `TERM=dumb` direct CLI output;
- `NO_COLOR=1` direct CLI output.


## Automatic overview status

The TUI Overview automatically displays package/version information and detected installation state. Manual detection actions are not exposed as normal user-facing actions.

## Clipboard integration

The TUI `F5` shortcut copies logs to the desktop clipboard. Preferred backends: `wl-copy`, KDE Klipper (`qdbus6`/`qdbus`), GPaste, `xclip`, then `xsel`.
