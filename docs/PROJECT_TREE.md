# Project tree notes

This file records high-level source ownership and shell-helper classification.
It is not a generated exhaustive inventory.

## C420UI and action execution

- `scripts/c420ui/` contains the current TypeScript C420UI implementation.
- `scripts/core/action-runner.ts` owns planned, dry-run, root, and confirmation
  policy for direct CLI actions.
- `scripts/c420ui/process-runner.ts` executes concrete commands only; it must not
  implement planned or dry-run fallback policy.

## Shell helper classification

See `docs/checks/SHELL_HELPER_CLASSIFICATION.md` for the authoritative shell
helper classification.

- Host tool: `scripts/sudo-common.sh` in the current repository layout.
- Canva Linux recipes: `scripts/build-appimage.sh`,
  `scripts/build-flatpak-bundle.sh`, `scripts/package-guidance-common.sh`,
  `scripts/validate-project.sh`, `scripts/validate-appimage.sh`, and
  `scripts/build-electron-dir.sh`.
- Repository check helper: `scripts/preflight-common.sh`.
- Obsolete: npm dependency bootstrap shell entrypoints; use explicit
  `npm ci --include=dev` instead.
