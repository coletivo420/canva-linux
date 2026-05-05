# AI Guardrails

- README is the public entry point; long command references belong in `docs/CLI.md`.
- Every behavior change must update `CHANGELOG.md`.
- TUI/Shell/CLI actions must be sourced from `scripts/actions.json`.
- Do not duplicate action logic in TUI/shell code.
- Native and Flatpak install flows must expose `system` and `user` scopes.
- Flatpak user scope must always show a duplication warning.
- System-wide actions must declare `requiresRoot`.
- TUI must ask for root authentication before privileged execution.
- Do not log passwords.
- Prefer shared sudo helpers over direct sudo calls.
- Keep ASCII logo light blue.
- Maintenance must keep installation detection visible at the top.
- Active docs must match current version/phase and validation flow.


## TUI UX Guardrails (dev.49)
- Do not render internal action metadata (`risk`, `longRunning`, `command`, `notes`) in the action information panel.
- Keep installation detection in a dedicated fixed box below the left menu across all primary views.
- Refresh detected installations after any state-changing maintenance or installation action.
- Keep completed progress result visible until the user navigates; clear only on navigation when idle.
- When no AppImage artifact exists, show `not detected` (never `loading...`).
