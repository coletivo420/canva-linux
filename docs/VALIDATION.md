# Validation Checklist (0.1.4-12)

Current target:

- Version: `0.1.4-12 (Alpha)`
- Release: `v0.1.4-12`

## Split validation model

- `npm run check:c420ui-core` validates reusable c420ui contracts.
- `npm run check:canva-linux` validates the Canva Linux adapter, app runtime contracts and concrete recipes.
- `npm run check:shared-tooling` validates repository-wide TypeScript, docs, dependency, source, runtime build and AI guardrail policies.
- `npm run check:legacy-tooling` temporarily preserves contracts that still live under `scripts/core/` until the c420ui/action-runner migration is complete.
- `npm run check:scripts-core` is a temporary aggregate that runs the four validation blocks above.
- `npm run check:c420ui-contracts` is a temporary compatibility alias for the c420ui core and Canva Linux checks.

## Automated

- `npm run build:scripts-core`
- `npm run check:scripts-core`
  - aggregates `check:c420ui-core`, `check:canva-linux`, `check:shared-tooling`, and `check:legacy-tooling`
- `npm run check:shared-tooling`
  - builds the runtime before checking it, then includes docs, dependency, source, TypeScript-first, wrapper, AI guardrail, and review checklist policies
- `npm run check:legacy-tooling`
  - preserves transitional `scripts/core/` runtime and tool contracts until they move to their final c420ui or Canva Linux validation domains
- `npm run check:no-source-javascript`
- `npm run check:source-integrity`
  - validates formatted package JSON, shell heredocs, launcher parser shape, and readable shell/docs shapes
  - protects launcher syntax with `bash -n canva-linux.sh`
  - requires the direct c420ui CLI bridge bundle to be rebuilt when bridge sources are newer
  - verifies launcher behavior with a stubbed direct c420ui CLI bridge entrypoint
  - verifies that global flags are translated before the c420ui CLI bridge receives direct action flags
- `npm run build:c420ui`
- `npm run check:c420ui`
- `npm run check:c420ui-core`
  - validates the generic c420ui package contracts without Canva Linux adapter checks
  - includes the c420ui action engine contract
- `npm run check:canva-linux`
  - validates the Canva Linux adapter and artifact recipes separately from c420ui core
- `npm run actions:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
  - strict by critical surface, not global strict; see `tsconfig.strict.json`
- `npm run check:gitignore-policy`
- `npm test`
  - compiles selected TypeScript tests plus support helpers to `.build/test/` before `node --test`
  - includes credential-storage policy contracts for Secret Service-backed persistent login only when encryption is available
  - includes `basic_text`, locked keyring, and detection-error ephemeral fallbacks
- `npm run docs:check-links`
- `npm run docs:check-ai`
  - validates the English-only maintained repository language guardrail and future i18n policy
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
- Confirm `./canva-linux.sh` opens the c420ui by default.
- Confirm `./canva-linux.sh --help` shows CLI help.
- Confirm root execution is blocked with a clear message before the c420ui or any direct CLI action starts.
- Confirm removed interface routing variables are not read by launcher code.
- Confirm direct CLI actions still work, for example `./canva-linux.sh --doctor`.
- Confirm planned c420ui actions are displayed as planned and are not treated as successful builds.
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
- Confirm c420ui root actions validate cached sudo credentials non-interactively after the c420ui password prompt.
- Confirm an action with `requiresRoot: true` and `scope: "user"` fails before its backend script starts.
- Confirm `--uninstall` and `--purge` request root only when a system-wide installation is detected.
- Confirm Application Settings appears below Maintenance & Uninstall.
- Confirm general Tool logs can be toggled and are persisted in `$XDG_CONFIG_HOME/canva-linux/tool-settings.json` or `~/.config/canva-linux/tool-settings.json`.
- Confirm Tool logs and Action logs are visually distinguishable in the logs panel.
- Confirm disabling general Tool logs still leaves critical Tool warnings/errors visible.
- Confirm terminal text selection mode disables c420ui mouse handling globally on the next c420ui start while keyboard scroll and F5 log copy continue to work.
- Confirm F6 opens a plain logs view with the session log path for manual selection fallback.

- Confirm starting on KDE Plasma with KWallet enabled and unlocked logs `kwallet`, `kwallet5`,
  or `kwallet6`, reports encryption available, and keeps persistent login available.
- Confirm starting on GNOME or a compatible desktop with GNOME Keyring/libsecret enabled and unlocked
  logs `gnome_libsecret`, reports encryption available, and keeps persistent login available.
- Confirm starting without a Secret Service backend, with `basic_text`, or with a locked/cancelled
  secure backend shows the ephemeral session warning before Canva loads.
- Confirm login does not persist after closing and reopening Canva Linux in ephemeral session mode.
- Confirm startup logs show whether persistent login is available or ephemeral session mode is active.
- Confirm startup logs show the credential storage backend, encryption availability, encryption verification status, and session policy.
- Confirm logs do not contain cookies, tokens, passwords, session contents or credential material.
- Confirm Tab and Shift+Tab move focus between menu, diagnostics, action panel and logs.
- Confirm the active panel has a visible border/label highlight and the active menu/settings cell has a visible row highlight.
- Confirm settings checkboxes show enabled and disabled state clearly.
- Confirm modal dialogs block Tab focus from returning to the main c420ui.
- Confirm running actions still allow Tab, focused-panel scrolling and F5 log copy while blocking new action execution.
- Confirm release artifact names preserve the generated architecture string (`x86_64`/`X86_64` when emitted) and never rewrite it to `x64`.
- Confirm `SHA256SUMS` contains the real generated AppImage, Flatpak and tarball names.
- Confirm `REVIEW.md` still starts with `# Review Checklist`.
- Confirm maintained source, comments, UI strings, README, docs, changelog, and AI maintenance instructions remain
  English-only until an explicit i18n system exists.
- Confirm new Node.js scripts, tests, and supported configs are authored in TypeScript, with shell reserved for host-operation glue.

## c420ui CLI bridge validation

- Confirm direct CLI actions are routed through the c420ui CLI bridge.
- Confirm multiple direct actions in one invocation fail before execution.
- Confirm dangerous direct actions require `--yes` before execution.
- Confirm direct CLI action stdout/stderr is visible to the caller.
- Confirm root/sudo preflight runs before privileged direct actions.
- Confirm planned direct actions still exit `78`.
- Confirm planned direct action dry-runs still exit `0`.
