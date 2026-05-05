# Technical Notes

## Workflow architecture

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
