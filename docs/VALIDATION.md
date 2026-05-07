# Validation Checklist (0.1.4-12)

Current target:

- Version: `0.1.4-12 (Alpha)`
- Release: `v0.1.4-12`

## Automated

- `npm run build:scripts-core`
- `npm run check:scripts-core`
  - includes `check-gitignore-policy`, `check-no-source-javascript`, and `check-source-integrity`
- `npm run check:no-source-javascript`
- `npm run check:source-integrity`
  - validates formatted package JSON, shell heredocs, and readable shell/docs shapes
- `npm run build:c420ui`
- `npm run check:c420ui`
- `npm run actions:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm run check:gitignore-policy`
- `npm test`
  - compiles selected TypeScript tests plus support helpers to `.build/test/` before `node --test`
- `npm run docs:check-links`
- `npm run docs:check-ai`
- `scripts/run-core-entry.sh check-no-shell-menu`
- `scripts/run-core-entry.sh check-sudo-contract`
- `scripts/run-core-entry.sh check-no-root-launch-contract`
- `scripts/run-core-entry.sh check-c420ui-settings-contract`
- `scripts/run-core-entry.sh check-tool-logging-contract`
- `scripts/run-core-entry.sh check-log-selection-contract`
- `scripts/run-core-entry.sh check-c420ui-header-layout`
- `scripts/run-core-entry.sh check-c420ui-branding`
- `scripts/run-core-entry.sh check-c420ui-project-boundary`
- `scripts/run-core-entry.sh check-action-contract`
- `scripts/run-core-entry.sh check-release-contract`
- `npm run validate:project`
  - fails if source JavaScript appears outside `.build/`, `node_modules/`, `coverage/`, or `dist/`; project-generated JavaScript belongs in `.build/` only
- `bash -n canva-linux.sh scripts/*.sh`
- `scripts/run-core-entry.sh overview-status`
- `scripts/run-core-entry.sh action-runner --cli --bundle-deb` exits `78` because `.deb` packaging is planned, not built.
- `scripts/run-core-entry.sh action-runner --cli --bundle-rpm` exits `78` because `.rpm` packaging is planned, not built.
- `scripts/run-core-entry.sh action-runner --cli --prepare-aur` exits `78` because AUR packaging is planned, not built.
- Planned-action dry runs exit `0` because they only resolve metadata:
  - `scripts/run-core-entry.sh action-runner --cli --bundle-deb --dry-run`
  - `scripts/run-core-entry.sh action-runner --cli --bundle-rpm --dry-run`
  - `scripts/run-core-entry.sh action-runner --cli --prepare-aur --dry-run`
- `bash scripts/show-detected-installations.sh`

## Manual

- Open `./canva-linux.sh`.
- Confirm `Release: v0.1.4-12`.
- Confirm `./canva-linux.sh` opens the C420UI by default.
- Confirm `./canva-linux.sh --help` shows CLI help.
- Confirm root execution is blocked with a clear message before the C420UI or any direct CLI action starts.
- Confirm removed interface routing variables are not read by launcher code.
- Confirm direct CLI actions still work, for example `./canva-linux.sh --doctor`.
- Confirm planned C420UI actions are displayed as planned and are not treated as successful builds.
- Confirm detected installs are green and not detected is purple.
- Confirm detected installs show installed versions, or `version unknown` when unreadable.
- Confirm the detection panel does not show `Detection error` after a successful Flatpak install.
- Confirm successful installs finish with `100% - Completed` in green.
- Confirm real failures finish with `0% - Error` in red.
- Confirm Ctrl+C cancellation shows `0% - Canceled` in red.
- Confirm help screen uses the same semantic colors.
- Confirm user/system action scopes are applied through `action.env`.
- Confirm user-scope actions do not request sudo.
- Confirm system-scope actions use `scripts/sudo-common.sh --validate` from Action Runner before backend scripts start.
- Confirm C420UI root actions validate cached sudo credentials non-interactively after the C420UI password prompt.
- Confirm an action with `requiresRoot: true` and `scope: "user"` fails before its backend script starts.
- Confirm `--uninstall` and `--purge` request root only when a system-wide installation is detected.
- Confirm Application Settings appears below Maintenance & Uninstall.
- Confirm general Tool logs can be toggled and are persisted in `$XDG_CONFIG_HOME/canva-linux/tool-settings.json` or `~/.config/canva-linux/tool-settings.json`.
- Confirm Tool logs and Action logs are visually distinguishable in the logs panel.
- Confirm disabling general Tool logs still leaves critical Tool warnings/errors visible.
- Confirm terminal text selection mode disables C420UI mouse handling globally on the next C420UI start while keyboard scroll and F5 log copy continue to work.
- Confirm F6 opens a plain logs view with the session log path for manual selection fallback.
- Confirm Tab and Shift+Tab move focus between menu, diagnostics, action panel and logs.
- Confirm the active panel has a visible border/label highlight and the active menu/settings cell has a visible row highlight.
- Confirm settings checkboxes show enabled and disabled state clearly.
- Confirm modal dialogs block Tab focus from returning to the main C420UI.
- Confirm running actions still allow Tab, focused-panel scrolling and F5 log copy while blocking new action execution.
- Confirm release artifact names preserve the generated architecture string (`x86_64`/`X86_64` when emitted) and never rewrite it to `x64`.
- Confirm `SHA256SUMS` contains the real generated AppImage, Flatpak and tarball names.
- Confirm `REVIEW.md` still starts with `# Review Checklist`.
- Confirm new Node.js scripts, tests, and supported configs are authored in TypeScript, with shell reserved for host-operation glue.
