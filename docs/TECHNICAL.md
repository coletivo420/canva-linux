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
2. `scripts/core/action-runner.ts`
   - action resolution/execution, compiled to `.build/scripts/core/action-runner.js`
3. Interfaces (Blessed C420UI and direct CLI flags)
4. Backend scripts under `scripts/`

All maintained Node.js source code is TypeScript. Project-generated JavaScript
belongs in `.build/` only. The `dist/`, `coverage/`, and `node_modules/`
directories may contain package, report, or dependency JavaScript, but they are
not maintained source locations. Shell remains shell for host operations such as
launcher routing, install/uninstall, sudo, purge, XDG integration, and pre-Node
validation glue.

## Terminal Assistant / Blessed C420UI

`./canva-linux.sh` opens the Blessed C420UI by default when stdin/stdout are TTY,
`TERM` is not `dumb`, and Node.js/npm are available. Legacy interface selection
flags and environment variables have been removed.

The Tool must run as a regular user. `canva-linux.sh`, `scripts/run-tui.ts`, and
the C420UI entrypoint refuse root execution before build, action, or C420UI startup.
System-wide operations request administrator authentication only for the action
that needs it.

The C420UI is a visual assistant over shared backend actions; it does not duplicate
install/package logic. It provides guided sections, log monitoring, and a
progress bar.

Application Settings are persistent C420UI state stored at
`$XDG_CONFIG_HOME/canva-linux/tool-settings.json`, with
`~/.config/canva-linux/tool-settings.json` as fallback. They are not entries in
`scripts/actions.json`.

Tool logs and Action logs are semantically distinct in the C420UI logs panel. Tool
logs cover startup, settings, detection, authentication and internal Tool errors.
Action logs cover stdout/stderr from install, build, validation, uninstall,
purge and maintenance operations. The launcher creates/truncates the session log
once, and the C420UI appends to it so launcher startup lines are preserved.

Terminal text selection mode is resolved before Blessed widgets are constructed.
When enabled before startup, it disables C420UI mouse handling globally for the
session, including the Blessed screen program when supported, so the terminal
can perform native text selection. Changes take effect on the next C420UI start.
Keyboard scrolling with PageUp, PageDown, Home and End remains available, F5
still copies the visible log history, and F6 opens a plain logs view with the
session log path as a manual-selection fallback. Some terminals may still
require Shift while selecting text.

The C420UI keeps an explicit FocusZone model for menu, diagnostics, action panel
and logs. Tab and Shift+Tab move between these blocks, the active block uses a
visible border/label highlight, and focused-panel scrolling is routed to the
current FocusZone. Enter and Space only execute menu/settings behavior while the
menu is focused and no action/modal is active.

## Sudo Contract

Privileged actions follow a shared contract defined in `scripts/sudo-common.sh`.

1. Actions with `requiresRoot: true` in `scripts/actions.json` are identified by the C420UI.
2. The C420UI requests root password via a secure prompt before starting the action.
3. The C420UI validates the password and then passes the root-auth environment marker to
   the child process.
4. `scripts/sudo-common.sh` detects this environment variable and uses
   `sudo -n` for non-interactive execution.
5. In direct CLI mode, `sudo` prompts for the password as usual in the terminal.

## TypeScript Script Core

The project validations and contracts are implemented in TypeScript under
`scripts/core/`. These are compiled into `.build/scripts/core/` and executed
through `scripts/run-core-entry.sh`. All project validations are integrated into
the `npm run check:scripts-core` quality gate. The gate includes
`check-no-source-javascript`, so maintained `.js` files under script, test,
config, or Flathub helper paths fail validation.

## Packaging roadmap notes

- `prepare-aur` is planned for a later packaging line.
- `.deb`/`.rpm` remain planned after AUR stabilization.

## Terminal theme

The Blessed C420UI and direct CLI output use a shared Canva-inspired visual language.

Reference palette:

- Light Blue: `#07B9CE`
- Blue: `#3969E7`
- Purple: `#7D2AE7`

The C420UI uses `scripts/c420ui/theme.ts`.
Direct CLI output uses ANSI-safe approximations through `scripts/ui-common.sh`.

The theme must remain readable with:

- truecolor terminals;
- xterm-256color;
- `TERM=dumb` direct CLI output;
- `NO_COLOR=1` direct CLI output.

## Automatic overview status

The C420UI Overview automatically displays package/version information and detected
installation state. Manual detection actions are not exposed as normal
user-facing actions.

## Clipboard integration

The C420UI `F5` shortcut copies logs to the desktop clipboard. Preferred backends:
`wl-copy`, KDE Klipper (`qdbus6`/`qdbus`), GPaste, `xclip`, then `xsel`. The
C420UI `F6` shortcut shows the plain visible log history and session log path in
the action panel for manual selection.
