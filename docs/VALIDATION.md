# Validation Checklist (0.1.4-14)

Current target:

- Version: `0.1.4-14 (Alpha)`
- Release: `v0.1.4-14`
- Versioning rule: `N.N.N-X`

## Release metadata checks

The validation baseline protects these release facts:

- `package.json` version is `0.1.4-14`.
- `package-lock.json` top-level version is `0.1.4-14`.
- `package-lock.json` root package version is `0.1.4-14`.
- `data/io.github.coletivo420.canva-linux.metainfo.xml` contains release `0.1.4-14`.
- Active release docs point to `v0.1.4-14`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`.

## Validation domains

- `npm run check:c420ui-core`
  - runs `check-c420ui-core-contracts.ts` as the consolidated c420ui core contract check
  - covers package and dependent-project boundaries, package policy, public API exports, bridge, detection,
    Action Engine, CLI, root provider, command runner, operational logs, artifact workflow runner, and
    interactive action runner contracts
- `npm run check:canva-linux`
  - runs `check-canva-linux-contracts.ts` as the consolidated Canva Linux contract check
  - covers the adapter, root provider, c420ui sudo helper, public branding, project boundary, action registry
    validation, artifact recipes, AppImage, Flatpak, release artifacts, launcher/session logs, and interactive log
    UI integration
- `npm run check:shared-tooling`
  - builds the runtime and shared script checks
  - runs AI guardrails, documentation links, dependency policy, runtime-build verification, and repository policy
    checks for repository-wide tooling coverage

Current direct CLI validation uses:

- `./canva-linux-c420ui-builder <flag>`
- `npm run c420ui:cli -- <flag>`

The consolidated domain runners are self-contained. New validation should extend the appropriate domain runner.
Do not create one-off check files or validation directories for domain-specific coverage.
Introduce shared helpers only when the policy applies across domains.

## Required automated validation

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run check:shared-tooling`
- `npm run check:scripts-core`
- `npm run validate`
- `npm run docs:check-links`
- `npm run docs:check-ai`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:strict`
- `npm test`
- `./scripts/validate-project.sh`

## Release grep review

Before release handoff, inspect the requested release grep set from the release task.
Only clearly historical changelog material may retain previous release identifiers.
Old AppStream history may retain old development release identifiers.
Generated dependency source manifests may retain platform package names that contain `x64`.

## Manual validation summary

- Confirm `./canva-linux-c420ui-builder` opens c420ui.
- Confirm direct CLI flags run through the c420ui CLI bridge.
- Confirm `Release: v0.1.4-14` appears in current release docs.
- Confirm AppImage, Flatpak, tarball and checksum release docs preserve real generated file names.
- Confirm root authentication prompts only for privileged actions.
- Confirm Secret Service-backed persistent login and ephemeral session policy remain documented.
