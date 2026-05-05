# Validation Checklist (0.1.4.11-dev.54)

Current target:
- Version: `0.1.4.11 (Alpha)`
- Phase: `0.1.4.11-dev.54`

## Automated
- npm run build:scripts-core
- npm run check:scripts-core
- npm run build:tui
- npm run check:tui
- npm run actions:validate
- npm run lint
- npm run typecheck
- npm run typecheck:strict
- npm test
- npm run docs:check-links
- npm run docs:check-ai
- node scripts/check-no-shell-menu.js
- node scripts/check-sudo-contract.js
- node scripts/check-action-contract.js
- npm run validate:project
- bash -n canva-linux.sh scripts/*.sh
- node scripts/overview-status.js
- bash scripts/show-detected-installations.sh

## Manual
- Open `./canva-linux.sh`.
- Confirm `Phase: 0.1.4.11-dev.55`.
- Confirm `./canva-linux.sh` opens the TUI by default.
- Confirm `./canva-linux.sh --help` shows CLI help.
- Confirm `./canva-linux.sh --tui` is not supported (or treated as CLI flag).
- Confirm `CANVA_NO_TUI=1 ./canva-linux.sh` still opens the TUI (env var ignored).
- Confirm direct CLI actions still work, for example `./canva-linux.sh --doctor`.
- Confirm detected installs are green and not detected is purple.
- Confirm detected installs show installed versions (or `version unknown` when unreadable).
- Confirm the detection panel does not show `Detection error` after a successful Flatpak install.
- Confirm successful installs finish with `100% - Completed` in green.
- Confirm real failures finish with `0% - Error` in red.
- Confirm Ctrl+C cancellation shows `0% - Canceled` in red.
- Confirm help screen uses the same semantic colors.
- Confirm user/system action scopes are applied through `action.env`.
- Confirm user-scope actions do not request sudo.
- Confirm system-scope actions use `scripts/sudo-common.sh`.
- Confirm `REVIEW.md` still starts with `# Review Checklist`.
