# Validation Checklist (0.1.4.11-dev.50)

Current target:
- Version: `0.1.4.11 (Alpha)`
- Phase: `0.1.4.11-dev.50`

## Automated
- npm run build:tui
- npm run check:tui
- npm run actions:validate
- npm run lint
- npm run typecheck
- npm run typecheck:strict
- npm test
- npm run docs:check-links
- npm run docs:check-ai
- npm run validate:project
- bash -n canva-linux.sh scripts/*.sh

## Manual
- Verify TUI header version and phase.
- Verify light-blue ASCII logo in TUI and shell tool.
- Verify install scope choices for Native/Flatpak (system/user).
- Verify Flatpak user warning appears in red.
- Verify maintenance detection is visible before action details.
- Verify root prompt is requested before privileged actions.
- Verify `Fix build directory permissions` exists and executes.


## TUI Regression Checklist (dev.49)
- [ ] Progress bar shows `100% - Completed` on success and is preserved until next navigation.
- [ ] Progress bar is cleared on menu/view/item navigation when no action is running.
- [ ] Fixed diagnostics box is visible below left menu on all main screens.
- [ ] Detection refresh runs after install/uninstall/clean/purge actions.
- [ ] Action panel scroll works with `Alt+↑/Alt+↓` and `Shift+PageUp/Shift+PageDown`.
- [ ] Action panel contains only action + description + warning, no internal metadata fields.
