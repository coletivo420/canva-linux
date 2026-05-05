# AI Guardrails

- All source code comments, README, docs, changelog, and AI maintenance instructions must be written in English.
- README is the public entry point; long command references belong in `docs/CLI.md`.
- Every behavior change must update `CHANGELOG.md`.
- TUI/Shell/CLI actions must be sourced from `scripts/actions.json`.
- Do not duplicate action logic in TUI/shell code.
- Do not ignore `action.env` from `scripts/actions.json`.
- Any `system`/`user` scope action must behave the same in TUI, shell, and direct CLI.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- System-wide actions must declare `requiresRoot`.
- TUI must ask for root authentication before privileged execution.
- Do not log passwords.
- Prefer shared sudo helpers over direct sudo calls.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- Active docs must match current version/phase and validation flow.
- `REVIEW.md` must preserve the Review Checklist.
- File inventories must be appended under a separate section or moved to `docs/REPOSITORY_INVENTORY.md`.
- Never replace process safety checklists with generated inventories.
- The custom EyeDropper flow must route through bundled CL-EyeDropper snapshot canvas picking.
- Do not replace typed `EyeDropperOpenOptions` handling with `any` casts or untyped signal extraction.

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
