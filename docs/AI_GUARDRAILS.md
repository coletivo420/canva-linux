# AI Guardrails

- All source code comments, README, docs, changelog, and AI maintenance
  instructions must be written in English.
- README is the public entry point; long command references belong in `docs/CLI.md`.
- Every behavior change must update `CHANGELOG.md`.
- TUI/CLI actions must be sourced from `scripts/actions.json`.
- Do not duplicate action logic in TUI or launcher code.
- Do not ignore `action.env` from `scripts/actions.json`.
- Any `system`/`user` scope action must behave the same in TUI and direct CLI.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- System-wide actions must declare `requiresRoot`.
- TUI must ask for root authentication before privileged execution.
- Do not log passwords.
- Prefer shared sudo helpers over direct sudo calls.
- The interactive shell menu has been removed. Do not reintroduce
  `run_interactive_mode`, `menu_install`, `menu_dev`, `menu_maint`, or tool
  switching.
- The project exposes only TUI and direct CLI actions.
- `--no-tui` and `--tui` flags are removed. The launcher opens TUI when
  called without args; any argument is resolved as direct CLI.
- `CANVA_NO_TUI` and `CANVA_TUI` environment variables are removed and must
  not be read for interface routing.
- Backend shell scripts may remain shell scripts, but shell UI menus are forbidden.
- System-wide actions must use scripts/sudo-common.sh.
- Raw sudo calls are forbidden outside scripts/sudo-common.sh.
- User-scope actions must never call sudo.
- TUI root authentication must happen before privileged execution.
- Passwords must never be logged.
- overview-status must always emit valid JSON.
- Detection errors must not break the TUI layout.
- Action metadata must come from scripts/actions.json.
- TUI and CLI must share the same TypeScript action contract.
- REVIEW.md must preserve the Review Checklist.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- Active docs must match current version/phase and validation flow.
- `REVIEW.md` must preserve the Review Checklist.
- File inventories must be appended under a separate section or moved to
  `docs/REPOSITORY_INVENTORY.md`.
- Never replace process safety checklists with generated inventories.
- The custom EyeDropper flow must route through bundled CL-EyeDropper
  snapshot canvas picking.
- Do not replace typed `EyeDropperOpenOptions` handling with `any` casts or
  untyped signal extraction.

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

Additional rules:

- Only `not detected` should use purple in status output and optional accent usage.
- Detection refresh must not clear/override progress results.
- Progress refresh must not convert a completed action into an error.
- Installed-version detection must be updated whenever install layout changes.
- Docs must reflect the current phase only; historical details belong in `CHANGELOG.md`.
