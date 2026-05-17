# Validation Checklist (0.1.4-15.Dev.8)

Current target:

- Version: `0.1.4-15.Dev.8 (Alpha)`
- Release: `v0.1.4-15.Dev.8`
- Versioning rule: `N.N.N-X`

## Release metadata checks

The validation baseline protects these release facts:

- `package.json` version is `0.1.4-15.Dev.8`.
- `package-lock.json` top-level version is `0.1.4-15.Dev.8`.
- `package-lock.json` root package version is `0.1.4-15.Dev.8`.
- `data/io.github.coletivo420.canva-linux.metainfo.xml` contains release `0.1.4-15.Dev.8`.
- Active release docs point to `v0.1.4-15.Dev.8`.
- Forbidden release identities include `0.1.4-dev.15.8`, `0.1.4-rc.15`, and `0.1.4.15.8`.

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

- `./canva-linux.sh <flag>`
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

- Confirm `./canva-linux.sh` opens c420ui.
- Confirm direct CLI flags run through the c420ui CLI bridge.
- Confirm `Release: v0.1.4-15.Dev.8` appears in current release docs.
- Confirm AppImage, Flatpak, tarball and checksum release docs preserve real generated file names.
- Confirm root authentication prompts only for privileged actions.
- Confirm Secret Service-backed persistent login and ephemeral session policy remain documented.

## Dev.8 pinned home tab-strip validation

- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model.
  It must be rendered by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar.
  Do not change BrowserWindow title logic for this feature. Do not render the home tab twice.
- Validate that a home-only state renders one `.pinned-home` and zero regular `.tab` items.
- Validate that a home-plus-tabs state renders one `.pinned-home`, renders regular tabs from `state.tabs`,
  and sends `go-home` when the pinned home control is clicked.

