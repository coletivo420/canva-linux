# AI Guardrails

This file is auxiliary maintenance policy for AI agents. It is not public user documentation.

## Language and future i18n

- All maintained source code, code comments, UI strings, README, docs, changelog and AI maintenance instructions must be written in English.
- Do not add Portuguese comments, Portuguese docs, Portuguese UI strings, or mixed-language source text to the repository.
- User-facing translations may be introduced later through an explicit i18n architecture.
- Do not hardcode future translations directly in runtime code.
- Future i18n must use structured translation resources, typed keys and fallback language rules.
- Until an i18n system exists, English is the only maintained repository language.
- README is the public entry point; long command references belong in `docs/CLI.md`.
- Active docs must match current version/phase and validation flow.
- Docs must reflect the current phase only; historical details belong in `CHANGELOG.md`.
- REVIEW.md must preserve the Review Checklist.
- File inventories must be appended under a separate section or moved to `docs/internal/REPOSITORY_INVENTORY.md`.
- Never replace process safety checklists with generated inventories.

## Versioning

- Preserve version `0.1.4-12` unless the maintainer explicitly requests a versioning change.
- Do not introduce `0.1.4-12.RC2`.
- Release identity must use the npm-compatible package version everywhere; do not publish four-number dotted versions.
- Every behavior change must update `CHANGELOG.md`.


## Project tree boundaries

- Read `docs/PROJECT_TREE.md` before moving code across Electron, scripts, c420ui, packaging,
  docs, or generated-output boundaries.
- `scripts/c420ui/` is the current transitional in-repo c420ui implementation before package split.
- `scripts/c420ui-canva-linux/` is the Canva Linux adapter boundary, not a public c420ui API.
- `packages/c420ui/` is a planned standalone package boundary, not a published package promise.
- Do not document c420ui as an externally consumable package until the maintainer explicitly requests publication.
- Keep generated output in `.build/`, `dist/`, `coverage/`, or `repo/`; do not treat it as maintained source.


## c420ui separation roadmap

- Read `docs/ROADMAP_C420UI_SEPARATION.md` before moving c420ui code toward packages or adapters.
- Separate for compatibility first and external extraction later.
- Do not migrate c420ui to ESM during the current separation phase.
- Do not publish or promise an NPM package during the current separation phase.
- Do not remove `scripts/c420ui/` in one large change.
- Do not change visual behavior as part of package-boundary work.
- Do not rewrite Action Runner as part of c420ui separation.
- Do not change versioning as part of c420ui separation.

## c420ui

- The official tool name is `c420ui`, lowercase.
- Do not use `C420UI` as public product branding.
- Transitional TypeScript symbols may keep PascalCase aliases temporarily, but user-facing text must say `c420ui`.
- The c420ui logo must remain the approved three-line lowercase logo unless the maintainer explicitly requests a redesign.
- c420ui is the user-facing name of the terminal interface.
- Do not reintroduce Terminal Assistant as product name.
- Do not use TUI as product name.
- The interactive shell menu has been removed. Do not reintroduce `run_interactive_mode`, `menu_install`, `menu_dev`, `menu_maint`, or tool switching.
- The project exposes only c420ui and direct CLI actions.
- Legacy explicit c420ui routing flags are removed. The launcher opens c420ui when called without args; any argument is resolved as direct CLI.
- Legacy interface-routing environment variables are removed and must not be read for interface routing.
- Backend shell scripts may remain shell scripts, but shell UI menus are forbidden.
- Application Settings are c420ui state, not shell actions.
- c420ui must keep an explicit FocusZone model.
- Tab and Shift+Tab must move between focusable c420ui blocks.
- The active c420ui block must have a visible border/label highlight.
- The active menu/settings cell must have a visible highlight.
- Settings checkboxes must show enabled/disabled state clearly.
- Modal dialogs must not leak Tab focus back to the main c420ui.
- During running actions, Tab/scroll/log copy may work, but action execution must remain blocked.
- Help must document current keyboard navigation.
- Manual text selection mode must disable mouse capture globally, not only on the logs widget.
- terminalTextSelectionMode must disable mouse capture globally, not only on the logs widget.
- c420ui mouse settings must be restored when leaving text selection mode.
- F5 log copy must work regardless of text selection mode.
- F5 clipboard copy must keep working even when text selection mode is enabled.
- Help must document log copy, manual selection and terminal limitations.
- Help must document terminal text selection limitations.
- Tool-level logs must be visible in the c420ui when general Tool logs are enabled.
- Action logs and Tool logs must remain distinguishable.
- Detection errors must not break the c420ui layout.
- overview-status must always emit valid JSON.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- c420ui Header and Project Header must remain separate fixed components.
- Side-by-side header layout is preferred on wide terminals.
- Stacked header layout is allowed only as a narrow-terminal fallback.
- Workspace must start below the tallest header row.
- c420ui Header must use only c420ui brand config.
- Project Header must use only project config.
- c420ui core must not hardcode project-specific metadata.
- Project metadata must come from config/adapters.
- Headers must not be part of FocusZone or Tab navigation.
- Do not manually move only the Overview panel; always use shared workspaceTop.
- c420ui brand metadata must be reusable across projects.
- Project header metadata must be injected through configuration.
- Other projects must be able to reuse c420ui without editing the c420ui core.

## Action Registry

- c420ui/CLI actions must be sourced from `scripts/actions.json`.
- Action metadata must come from `scripts/actions.json`.
- Do not duplicate action logic in c420ui or launcher code.
- Do not ignore `action.env` from `scripts/actions.json`.
- Any `system`/`user` scope action must behave the same in c420ui and direct CLI.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- c420ui and CLI must share the same TypeScript action contract.
- Preserve Action Runner root/planned-action behavior.
- Detection refresh must not clear or override progress results.
- Progress refresh must not convert a completed action into an error.
- Installed-version detection must be updated whenever install layout changes.

## Root/sudo

- Do not run or recommend `./canva-linux.sh` as root.
- Never instruct users to run `./canva-linux.sh` with sudo.
- The Tool must run as a regular user.
- Privileged operations must request authentication only when needed.
- System-wide actions must declare `requiresRoot`.
- c420ui root authentication must happen before privileged execution.
- Sudo/root authentication failures must be shown in a centered c420ui popup.
- Prefer shared sudo helpers over direct sudo calls.
- System-wide actions must use scripts/sudo-common.sh.
- Raw sudo calls are forbidden outside scripts/sudo-common.sh.
- User-scope actions must never call sudo.
- Sudo contract checks must tolerate valid shell whitespace around assignments.

## Credential storage

- Persistent login must require a secure Linux Secret Service backend.
- The secure backend must also have `safeStorage.isEncryptionAvailable() === true`; the selected backend name alone is not sufficient.
- If Electron reports `basic_text`, Canva Linux must use ephemeral session mode.
- `basic_text` must never use the `persist:canva` partition.
- `basic_text` must remain ephemeral even if encryption is reported available.
- Ephemeral session mode must warn the user that login, cookies and credentials will not be saved.
- Do not claim credentials are securely stored when the selected backend is `basic_text`.
- Do not claim credentials are securely stored when the backend is unknown, unverifiable,
  or when a secure backend has unavailable encryption.
- Do not log passwords, cookies, tokens, session values or credential material.
- Persistent Canva login on Linux depends on a secure Secret Service backend with available encryption;
  the selected backend name alone is not sufficient.
- Secure Electron backend names include `kwallet`, `kwallet5`, `kwallet6`, and `gnome_libsecret`.
- `basic_text` is an insecure fallback and must use ephemeral session mode.
- Unknown or failed credential-backend detection, failed encryption-availability detection,
  and secure backends with unavailable encryption must use ephemeral session mode by caution.
- Do not describe login persistence as universal; document it as Secret Service-backed.
- Do not use `safeStorage.setUsePlainTextEncryption()` to preserve login.
- Do not log cookies, tokens, passwords, session contents or credential material while diagnosing credential storage.

## Logging/privacy

- Never log passwords, sudo stdin, cookies, tokens, or credential material.
- Session log write failures must not fail silently.
- c420ui session logging must not fail silently.
- If the session log stream cannot be opened, the UI must expose a warning without recursion.
- writeSession must not call appendLogText directly to avoid recursion.

## TypeScript-first

- TypeScript is mandatory for all maintained Node.js source code.
- JavaScript is generated output only.
- Shell remains shell for host operations.
- New scripts must be TypeScript unless they are shell scripts for host operations.
- New tests must be TypeScript.
- New configs should be TypeScript when tool-supported.
- Do not create new JavaScript source files.
- Do not add `scripts/*.js` as maintained source.
- Do not add `test/*.js`.
- Do not add JavaScript config files when TypeScript config is supported.
- JavaScript may exist only as project-generated output under `.build`, package-managed dependencies under `node_modules`,
  generated coverage output under `coverage`, or distributable output under `dist`.
- Project-generated JavaScript belongs in `.build` only; do not place maintained or project-generated script artifacts elsewhere.
- Shell scripts are allowed only for Linux host operations, launcher glue, Flatpak/native install, sudo, purge, XDG,
  and validation that must run before Node.
- JSON/YAML/XML/Desktop files remain native data formats and must be validated by TypeScript checks where appropriate.
- Flathub source generation must be TypeScript-backed.
- If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.
- Shell bootstraps may invoke TypeScript entrypoints, but JavaScript wrappers must not be reintroduced.
- If a new script needs logic, create it under `scripts/core/*.ts` or as a typed script-specific `.ts` file.
- Do not add maintained JavaScript implementation, test, config, bootstrap, or compatibility-wrapper files.
- Do not duplicate TypeScript core logic in JavaScript fallbacks.
- `scripts/run-core-entry.sh` must only build or run compiled TypeScript core entries; it must not contain fallback
  implementations of status, registry, runner, validation, or detection contracts.
- Flathub/npm source generation logic lives in TypeScript; `packaging/flathub/scripts/generate-npm-sources.sh`
  invokes `generate-npm-sources.ts` through the TypeScript entry runner.

## CL-EyeDropper

- Preserve CL-EyeDropper.
- The custom EyeDropper flow must route through bundled CL-EyeDropper snapshot canvas picking.
- Do not replace typed `EyeDropperOpenOptions` handling with `any` casts or untyped signal extraction.
- Preserve cleanup of the snapshot host, CL-EyeDropper UI, and Escape/abort listeners.
- Preserve regression tests for snapshot picking and cleanup.

## Packaging/architecture

- Release workflow must build and upload AppImage, Flatpak bundle, linux-unpacked tarball, and SHA256SUMS.
- Release workflow must use deterministic artifact names and must fail if an expected asset is missing or empty.
- Release docs must keep `docs/RELEASE.md` available for GitHub Release notes.
- Release asset architecture names must preserve upstream/tooling architecture names.
- Preserve real generated architecture names such as `x86_64` or `X86_64`.
- Do not normalize `x86_64` or `X86_64` to `x64`.
- AppImage, Flatpak, tarball and checksum entries must use the actual generated architecture string.
- Release docs and workflows must not hardcode `x64` unless the tool actually emits `x64`.

## Changelog/review

- Do not remove validation checks to make a build pass.
- Report validations executed and anything not tested.
- Before approving cleanup or simplification, compare the proposed change against `CHANGELOG.md`.
- Do not approve changes that remove, weaken, bypass, or silently alter behavior already documented in `CHANGELOG.md`
  unless the maintainer explicitly requested that change.
- When in doubt, ask for clarification instead of assuming old behavior is disposable.

## Mandatory color semantics

- detected/completed = green
- in progress = yellow
- error/canceled = red
- not detected = purple
- selected action value = default readable text color
- description/help text = default readable text color
- information box main titles = dark blue
- information item titles = green

### Additional color rules

- Only `not detected` should use purple in status output and optional accent usage.
