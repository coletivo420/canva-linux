# AI Guardrails

- All source code comments, README, docs, changelog, and AI maintenance
  instructions must be written in English.
- README is the public entry point; long command references belong in `docs/CLI.md`.
- Every behavior change must update `CHANGELOG.md`.
- C420UI/CLI actions must be sourced from `scripts/actions.json`.
- C420UI is the user-facing name of the terminal interface.
- Do not reintroduce Terminal Assistant as product name.
- Do not use TUI as product name.
- Do not duplicate action logic in C420UI or launcher code.
- Do not ignore `action.env` from `scripts/actions.json`.
- Any `system`/`user` scope action must behave the same in C420UI and direct CLI.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- System-wide actions must declare `requiresRoot`.
- C420UI must ask for root authentication before privileged execution.
- Do not log passwords.
- Prefer shared sudo helpers over direct sudo calls.
- Never instruct users to run `./canva-linux.sh` with sudo.
- The Tool must run as a regular user.
- Privileged operations must request authentication only when needed.
- Tool-level logs must be visible in the C420UI when general Tool logs are enabled.
- Action logs and Tool logs must remain distinguishable.
- C420UI must keep an explicit FocusZone model.
- Tab and Shift+Tab must move between focusable C420UI blocks.
- The active C420UI block must have a visible border/label highlight.
- The active menu/settings cell must have a visible highlight.
- Settings checkboxes must show enabled/disabled state clearly.
- Modal dialogs must not leak Tab focus back to the main C420UI.
- During running actions, Tab/scroll/log copy may work, but action execution must remain blocked.
- Help must document current keyboard navigation.
- Manual text selection mode must disable mouse capture globally, not only on the logs widget.
- terminalTextSelectionMode must disable mouse capture globally, not only on the logs widget.
- C420UI mouse settings must be restored when leaving text selection mode.
- F5 log copy must work regardless of text selection mode.
- F5 clipboard copy must keep working even when text selection mode is enabled.
- Help must document log copy, manual selection and terminal limitations.
- Help must document terminal text selection limitations.
- Release workflow must build and upload AppImage, Flatpak bundle,
  linux-unpacked tarball, and SHA256SUMS.
- Release workflow must use deterministic artifact names and must fail if an
  expected asset is missing or empty.
- Release docs must keep `docs/RELEASE.md` available for GitHub Release notes.
- Release identity must use the npm-compatible package version everywhere; do
  not publish four-number dotted versions.
- Release asset architecture names must preserve upstream/tooling architecture names.
- Do not normalize `x86_64` or `X86_64` to `x64`.
- AppImage, Flatpak, tarball and checksum entries must use the actual generated architecture string.
- Release docs and workflows must not hardcode `x64` unless the tool actually emits `x64`.
- Passwords and sudo stdin must never be logged.
- Session log write failures must not fail silently.
- C420UI session logging must not fail silently.
- If the session log stream cannot be opened, the UI must expose a warning without recursion.
- writeSession must not call appendLogText directly to avoid recursion.
- Sudo contract checks must tolerate valid shell whitespace around assignments.
- Application Settings are C420UI state, not shell actions.
- New UI strings, docs and comments must be written in English.
- The interactive shell menu has been removed. Do not reintroduce
  `run_interactive_mode`, `menu_install`, `menu_dev`, `menu_maint`, or tool
  switching.
- The project exposes only C420UI and direct CLI actions.
- Legacy explicit C420UI routing flags are removed. The launcher opens C420UI when
  called without args; any argument is resolved as direct CLI.
- Legacy interface-routing environment variables are removed and must not be
  read for interface routing.
- Backend shell scripts may remain shell scripts, but shell UI menus are forbidden.
- System-wide actions must use scripts/sudo-common.sh.
- Raw sudo calls are forbidden outside scripts/sudo-common.sh.
- User-scope actions must never call sudo.
- C420UI root authentication must happen before privileged execution.
- Sudo/root authentication failures must be shown in a centered C420UI popup.
- Sudo passwords must never be logged.
- Passwords must never be logged.
- overview-status must always emit valid JSON.
- Detection errors must not break the C420UI layout.
- Action metadata must come from scripts/actions.json.
- C420UI and CLI must share the same TypeScript action contract.
- REVIEW.md must preserve the Review Checklist.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- Active docs must match current version/phase and validation flow.
- `REVIEW.md` must preserve the Review Checklist.
- File inventories must be appended under a separate section or moved to
  `docs/internal/REPOSITORY_INVENTORY.md`.
- Never replace process safety checklists with generated inventories.
- The custom EyeDropper flow must route through bundled CL-EyeDropper
  snapshot canvas picking.
- Do not replace typed `EyeDropperOpenOptions` handling with `any` casts or
  untyped signal extraction.
- The C420UI header and project/tool header must remain separate components.
- C420UI Header and Project Header must be separate fixed components.
- Side-by-side header layout is preferred on wide terminals.
- Stacked header layout is allowed only as a narrow-terminal fallback.
- Workspace must start below the tallest header row.
- C420UI Header must use only C420UI brand config.
- C420UI core must not hardcode project-specific metadata.
- Project metadata must come from config/adapters.
- Project Header must use only project config.
- Headers must not be part of FocusZone or Tab navigation.
- Do not manually move only the Overview panel; always use shared workspaceTop.
- Project-specific names must not be hardcoded in the C420UI header.
- C420UI brand metadata must be reusable across projects.
- Project header metadata must be injected through configuration.
- Other projects must be able to reuse C420UI without editing the C420UI core.

## TypeScript-first Node.js rules

- TypeScript is mandatory for all Node.js source code.
- All maintained Node.js source code is TypeScript.
- JavaScript is generated output only.
- Shell remains shell for host operations.
- New scripts must be TypeScript unless they are shell scripts for host
  operations.
- New tests must be TypeScript.
- New configs should be TypeScript when tool-supported.
- Do not create new JavaScript source files.
- Do not add `scripts/*.js` as maintained source.
- Do not add `test/*.js`.
- Do not add JavaScript config files when TypeScript config is supported.
- JavaScript may exist only as project-generated output under `.build`,
  package-managed dependencies under `node_modules`, generated coverage output
  under `coverage`, or distributable output under `dist`.
- Project-generated JavaScript belongs in `.build` only; do not place
  maintained or project-generated script artifacts elsewhere.
- Shell scripts are allowed only for Linux host operations, launcher glue,
  Flatpak/native install, sudo, purge, XDG, and validation that must run before
  Node.
- JSON/YAML/XML/Desktop files remain native data formats and must be
  validated by TypeScript checks where appropriate.
- Flathub source generation must be TypeScript-backed.
- If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.
- Shell bootstraps may invoke TypeScript entrypoints, but JavaScript wrappers must not be reintroduced.
- If a new script needs logic, create it under `scripts/core/*.ts` or as a
  typed script-specific `.ts` file.
- Do not add maintained JavaScript implementation, test, config, bootstrap,
  or compatibility-wrapper files.
- Do not duplicate TypeScript core logic in JavaScript fallbacks.
- `scripts/run-core-entry.sh` must only build or run compiled TypeScript core
  entries; it must not contain fallback implementations of status, registry,
  runner, validation, or detection contracts.
- Flathub/npm source generation logic lives in TypeScript;
  `packaging/flathub/scripts/generate-npm-sources.sh` invokes
  `generate-npm-sources.ts` through the TypeScript entry runner.

## Mandatory color semantics

- detected/completed = green
- in progress = yellow
- error/canceled = red
- not detected = purple
- selected action value = default readable text color
- description/help text = default readable text color
- information box main titles = dark blue
- information item titles = green

### Additional rules

- Only `not detected` should use purple in status output and optional accent usage.
- Detection refresh must not clear/override progress results.
- Progress refresh must not convert a completed action into an error.
- Installed-version detection must be updated whenever install layout changes.
- Docs must reflect the current phase only; historical details belong in `CHANGELOG.md`.
