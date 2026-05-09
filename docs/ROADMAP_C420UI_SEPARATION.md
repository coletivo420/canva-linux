# c420ui Separation Roadmap

## Goal

Track the completed internal c420ui separation work and the remaining release-candidate readiness tasks for Canva Linux.

This roadmap is compatibility-first maintenance documentation. It does not start NPM publication, external package support, or module-system migration.

## Completed

- Package boundary under `packages/c420ui`.
- Canva Linux adapter under `scripts/c420ui-canva-linux`.
- Direct CLI bridge.
- Shared Action Engine.
- Shared Root Provider contract.
- Canva Linux Root Provider.
- Shared Command Runner.
- Operational log redaction.
- Interactive c420ui execution through Action Engine.
- Consolidated validation domains.

## Current phase

- Stale docs cleanup.
- Legacy Action Runner audit.
- Artifact workflow runner.
- RC readiness.

## Current execution model

Direct launcher actions route through `.build/scripts/run-c420ui-cli.js`, the Canva Linux c420ui CLI bridge, and the reusable c420ui Action Engine.

Interactive Canva Linux c420ui actions use the same Action Engine, Root Provider contract, Canva Linux Root Provider, Command Runner, and operational log redaction policy.

Legacy Action Runner compatibility remains available manually through `check:legacy-compat`, but it is not part of the default validation path and is not the primary direct CLI validation path.

## Validation domains

Validation is consolidated by domain:

- c420ui core checks: `packages/c420ui/checks/check-c420ui-core-contracts.ts`.
- Canva Linux checks: `scripts/checks/canva-linux/check-canva-linux-contracts.ts`.
- Shared repository tooling: `scripts/core/check-repository-policy.ts` plus dedicated docs, dependency, runtime, and AI guardrail checks.

New c420ui or Canva Linux behavior checks should extend the relevant consolidated domain runner unless a shared repository helper is required.

## Next phases

1. Audit legacy Action Runner.
2. Build artifact workflow runner.
3. Split docs by domain.
4. Public docs cleanup.
5. RC validation matrix.

## Non-goals

- Do not migrate to ESM.
- Do not publish or promise an NPM package.
- Do not remove `scripts/c420ui/` in one large change.
- Do not change visual behavior as part of docs cleanup or RC readiness work.
- Do not rewrite or remove the legacy Action Runner incidentally; any retirement or wrapper conversion must happen in a dedicated legacy audit commit.
- Do not change versioning.
- Do not move generated JavaScript into maintained source trees.
- Do not change release artifact architecture naming.
