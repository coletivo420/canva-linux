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
- Legacy Action Runner removed after direct CLI and interactive c420ui execution migrated to the shared Action Engine.

## Current phase

- Artifact workflow runner.
- Docs domain split.
- Public docs cleanup.
- RC validation matrix.

## Current execution model

Direct launcher actions route through `.build/scripts/run-c420ui-cli.js`, the Canva Linux c420ui CLI bridge, and the reusable c420ui Action Engine.

Interactive Canva Linux c420ui actions use the same Action Engine, Root Provider contract, Canva Linux Root Provider, Command Runner, and operational log redaction policy.


## Validation domains

Validation is consolidated by domain:

- c420ui core checks: `packages/c420ui/checks/check-c420ui-core-contracts.ts`.
- Canva Linux checks: `scripts/checks/canva-linux/check-canva-linux-contracts.ts`.
- Shared repository tooling: `scripts/core/check-repository-policy.ts` plus dedicated docs, dependency, runtime, and AI guardrail checks.

New c420ui or Canva Linux behavior checks should extend the relevant consolidated domain runner unless a shared repository helper is required.

## Next phases

1. Artifact workflow runner.
2. Docs domain split.
3. Public docs cleanup.
4. RC validation matrix.

## Non-goals

- Do not migrate to ESM.
- Do not publish or promise an NPM package.
- Do not remove `scripts/c420ui/` in one large change.
- Do not change visual behavior as part of docs cleanup or RC readiness work.
- Do not restore the removed legacy Action Runner or its compatibility validation path.
- Do not change versioning.
- Do not move generated JavaScript into maintained source trees.
- Do not change release artifact architecture naming.
