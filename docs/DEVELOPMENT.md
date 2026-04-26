# Development Workflow (1.4.10-dev.20 — Quality Gates)

This cycle prioritizes maintainability foundations and repeatable quality checks.

## Scope for dev20

In scope:

- Lint and import hygiene.
- Lightweight script and syntax fixes.
- Project validation workflow consolidation.
- Development and release documentation updates.

Out of scope:

- Major UI redesigns.
- Full app architecture rewrites.
- Deep Flatpak workflow redesign.
- Final Flathub publication.
- Framework migration.
- Aggressive large-scale refactors.

## Recommended execution order

1. Baseline diagnostics:

   ```bash
   git status
   npm run lint
   npm test
   ./scripts/validate-flatpak.sh
   ```

2. Lint/import gate improvements.
3. Small targeted fixes.
4. Validation script updates.
5. Documentation updates.
6. Final closure checks.

## Development guardrails

- Keep changes small and reviewable.
- Prefer additive scripts/docs over large behavior changes.
- Keep Flatpak local workflow and Flathub submission workflow separated.
- Treat this phase as foundation work for dev21/dev22 follow-up cycles.
