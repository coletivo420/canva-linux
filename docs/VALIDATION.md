# Validation Checklist (0.1.4.11-dev.58)

Current target:

- Version: `0.1.4.11 (Alpha)`
- Phase: `0.1.4.11-dev.58`

## Automated

- npm run build:scripts-core
- npm run check:scripts-core
  - includes `check-gitignore-policy`, `check-no-source-javascript`, and
    `check-source-integrity`
- npm run check:no-source-javascript
- npm run check:source-integrity
  - validates formatted package JSON, shell heredocs, and readable shell/docs
    shapes
- npm run build:tui
- npm run check:tui
- npm run actions:validate
- npm run lint
- npm run typecheck
- npm run typecheck:strict
- npm run check:gitignore-policy
- npm test
  - compiles selected TypeScript tests plus support helpers to `.build/test/`
    before `node --test`
- npm run docs:check-links
- npm run docs:check-ai
- scripts/run-core-entry.sh check-no-shell-menu
- scripts/run-core-entry.sh check-sudo-contract
- scripts/run-core-entry.sh check-no-root-launch-contract
- scripts/run-core-entry.sh check-tui-settings-contract
- scripts/run-core-entry.sh check-tool-logging-contract
- scripts/run-core-entry.sh check-log-selection-contract
- scripts/run-core-entry.sh check-action-contract
- npm run validate:project
  - fails if source JavaScript appears outside `.build/`, `node_modules/`,
    `coverage/`, or `dist/`; project-generated JavaScript belongs in `.build/`
    only
- bash -n canva-linux.sh scripts/\*.sh
- scripts/run-core-entry.sh overview-status
- bash scripts/show-detected-installations.sh

## Manual

- Open `./canva-linux.sh`.
- Confirm `Phase: 0.1.4.11-dev.58`.
- Confirm `./canva-linux.sh` opens the TUI by default.
- Confirm `./canva-linux.sh --help` shows CLI help.
- Confirm root execution is blocked with a clear message before the TUI or any
  direct CLI action starts.
- Confirm `./canva-linux.sh --tui` is rejected as an unknown direct CLI flag.
- Confirm removed interface routing variables are not read by launcher code.
- Confirm direct CLI actions still work, for example `./canva-linux.sh --doctor`.
- Confirm detected installs are green and not detected is purple.
- Confirm detected installs show installed versions, or `version unknown` when
  unreadable.
- Confirm the detection panel does not show `Detection error` after a successful Flatpak install.
- Confirm successful installs finish with `100% - Completed` in green.
- Confirm real failures finish with `0% - Error` in red.
- Confirm Ctrl+C cancellation shows `0% - Canceled` in red.
- Confirm help screen uses the same semantic colors.
- Confirm user/system action scopes are applied through `action.env`.
- Confirm user-scope actions do not request sudo.
- Confirm system-scope actions use `scripts/sudo-common.sh`.
- Confirm Application Settings appears below Maintenance & Uninstall.
- Confirm general Tool logs can be toggled and are persisted in
  `$XDG_CONFIG_HOME/canva-linux/tool-settings.json` or
  `~/.config/canva-linux/tool-settings.json`.
- Confirm Tool logs and Action logs are visually distinguishable in the logs
  panel.
- Confirm disabling general Tool logs still leaves critical Tool warnings/errors
  visible.
- Confirm terminal text selection mode disables logs-panel mouse handling while
  keyboard scroll and F5 log copy continue to work.
- Confirm `REVIEW.md` still starts with `# Review Checklist`.
- Confirm new Node.js scripts, tests, and supported configs are authored in
  TypeScript, with shell reserved for host-operation glue.
