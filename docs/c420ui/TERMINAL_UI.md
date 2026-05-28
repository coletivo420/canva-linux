# c420ui Terminal UI

The c420ui terminal UI is the generic interactive workspace. It renders c420ui
controls and dependent-project metadata without embedding Canva Linux runtime
logic.

## Controls

- c420ui header and dependent-project header layout.
- Focus zones, keyboard navigation, modal behavior, and settings state.
- Logs panel, progress bar, status messages, and copy/selection controls.
- Root-auth popup wiring through `requestRootAccess`.
- Terminal help and visible action workflow state.

## Must not control

- Electron windows, tabs, OAuth popups, upload/export behavior, CL-EyeDropper, or
  runtime debug behavior.
- Concrete Canva Linux action recipes.
- Package build implementation.

## Implementing files

- `build-resources/c420ui/src/terminal/app.ts`
- `build-resources/c420ui/src/terminal/runtime.ts`
- `build-resources/c420ui/src/terminal/interactive-action-runner.ts`
- `build-resources/c420ui/src/terminal/help.ts`
- `build-resources/c420ui/src/terminal/settings.ts`
- `build-resources/c420ui/src/terminal/root-guard.ts`
- `build-resources/c420ui/src/terminal/modal.ts`
- `build-resources/c420ui/src/terminal/clipboard.ts`

## Consumed configs and adapters

The terminal UI consumes the c420ui bridge and project UI metadata. Canva Linux
metadata comes from `build-resources/canva-linux/config/project-ui.json` through the adapter.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run docs:check-ai`
- `npm test`

## Forbidden regressions

- Do not merge the c420ui header and project header.
- Do not place headers in Tab focus zones.
- Do not move only the Overview panel instead of using shared workspace layout.
- Do not break F5 log copy when manual text selection mode is enabled.
- Do not show sudo/root failures outside the centered c420ui popup.
