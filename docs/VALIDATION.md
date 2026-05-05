# Validation Checklist (0.1.4.11-dev.48)

Current target:
- Version: `0.1.4.11 (Alpha)`
- Phase: `0.1.4.11-dev.48`

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
