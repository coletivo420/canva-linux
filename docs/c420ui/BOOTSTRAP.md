# c420ui Bootstrap

The c420ui builder now auto-generates missing or stale bootstrap bundles before launching.
Normal users only need npm installed; they do not need to run `npm run build:c420ui-bootstrap` manually.
Validation gates remain check-only and still fail when committed bootstrap artifacts are stale.
Runtime/builder fixes missing or stale bundles automatically; CI checks detect drift.

## Artifacts

- `build-resources/c420ui/bootstrap/generated/run-c420ui.mjs`
- `build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs`
- `build-resources/c420ui/bootstrap/generated/c420ui-builder.mjs`
- `build-resources/c420ui/bootstrap/generated/manifest.json`

## Contract

- Runtime/builder may auto-regenerate.
- `check:c420ui-bootstrap` and `check:c420ui-bootstrap-artifacts` are check-only.
- `build-resources/c420ui/scripts/build-bootstrap.ts` must not import `ensure-bootstrap.ts`.
