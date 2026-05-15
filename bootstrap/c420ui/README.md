# c420ui Bootstrap Bundle

`bootstrap/c420ui/*.cjs` are generated bootstrap artifacts. Do not edit them manually.

The source remains TypeScript-first in `scripts/run-c420ui.ts`, `scripts/run-c420ui-cli.ts`, `scripts/c420ui-adapter/*`, and `packages/c420ui/src/*`. Rebuild the bundle with:

```sh
npm run build:c420ui-bootstrap
```

The current bootstrap module format is explicit CommonJS. A future ESM bootstrap requires its own migration phase; do not set `type: module` or change the TypeScript module target as part of this bundle.

## Identity

This bootstrap belongs to c420ui, not to the dependent project.

- `c420uiVersion` comes from `packages/c420ui/package.json`.
- `dependentProjectVersion` comes from the repository root `package.json`.
- Do not collapse both identities into a single `version` field.
