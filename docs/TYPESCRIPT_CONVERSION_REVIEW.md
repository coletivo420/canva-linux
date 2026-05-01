# TypeScript Conversion Review

This project is migrating to TypeScript incrementally.

## Current mode

The runtime still executes CommonJS JavaScript directly.

TypeScript is currently used through:

- broad `npm run typecheck`;
- strict JSDoc islands through `npm run typecheck:strict`;
- no emitted TypeScript build output.

## DEV10 expansion

DEV10 expands strict typing to the remaining extracted main-process modules.

## Full conversion roadmap

The cleanup phase must happen after full TypeScript conversion, not before it.

Planned sequence:

- DEV10: strict typing for extracted main-process modules.
- DEV11: strict typing for `electron/main/index.js`.
- DEV12: TypeScript build pipeline.
- DEV13: convert the first pure shared/logging helper modules to `.ts` and validate the test strategy for converted source modules.
- DEV14: convert main infrastructure modules to `.ts`.
- DEV15: convert shell/tabs/OAuth modules to `.ts`.
- DEV16: convert main entrypoint to `.ts`.
- DEV17: convert preload source modules to `.ts`.
- DEV18: decide conversion/isolation strategy for `ltcode-eyedropper`.
- DEV19: convert tests/config/scripts when safe.
- DEV20: verify full TypeScript conversion.
- DEV21: post-conversion cleanup.
- DEV22: stabilization and RC readiness.

## Actual `.ts` conversion rule

A file may be converted to `.ts` only when:

- it is already covered by strict JSDoc or tests;
- conversion does not require unplanned runtime loader changes;
- conversion does not affect Flatpak packaging unexpectedly;
- conversion does not change public behavior;
- behavior is checked against `CHANGELOG.md`.

## Not ready yet

Do not convert yet:

- `electron/main/index.js`;
- `electron/preload/canva.js`;
- `electron/preload/canva.bundle.js`;
- `electron/preload/ltcode-eyedropper.js`;
- shell scripts;
- Flatpak manifests.
