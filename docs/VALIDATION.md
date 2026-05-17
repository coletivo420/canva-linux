# Validation Checklist (0.1.4-15.Dev.6)

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](c420ui/BUILDER_ALIAS.md).

Current target:

- Version: `0.1.4-15.Dev.6 (Alpha)`
- Release: `v0.1.4-15.Dev.6`
- Versioning rule: `N.N.N-X` with optional `.Dev.N` development phase suffixes

## Release metadata checks

The validation baseline protects these release facts:

- `package.json` version is `0.1.4-15.Dev.6`.
- `package-lock.json` top-level version is `0.1.4-15.Dev.6`.
- `package-lock.json` root package version is `0.1.4-15.Dev.6`.
- `data/io.github.coletivo420.canva-linux.metainfo.xml` contains release `0.1.4-14`.
- Active release docs point to `v0.1.4-15.Dev.6`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`.


## Validation tiers

Validation is layered so fast behavioral checks stay close to the code while release-only work remains explicit:

1. **Fast unit tests**
   - Cover parsers, the runtime CLI, `normalizeBuilderArgs`, credential-store selection, and small behavior-focused helpers.
2. **Lightweight contract checks**
   - Protect current entrypoints, package identity, App ID, runtime executable name, bootstrap manifest entrypoints, and `sourceHash` freshness.
3. **Minimal smoke tests**
   - Exercise `./canva-linux-c420ui-builder --help`, one planned action such as `--prepare-aur --dry-run`,
     one runtime-flag rejection such as `--debug=1`, and runtime `canva-linux --help`.
4. **RC/manual validation**
   - Covers Flatpak, AppImage, credential persistence, OAuth, GPU/display behavior, complete packaging, and release-artifact handoff.

Historical anti-regression string checks against removed migration names should be simplified once a migration stabilizes.
Checks that protect active behavior boundaries, such as valued runtime options requiring `--option=value`, should remain covered
by contracts and behavioral tests. GPU/display RC validation must inspect the central log for
`gpu:runtime runtime-options`. The log must include `gpuBackend`, `displayOverride`, `forceX11`, `forceWayland`,
and `disableWaylandColorManager`, not just the fact that options came from `runtime-cli`.

## Validation domains

- `npm run check:c420ui-core`
  - runs `check-c420ui-core-contracts.ts` as the consolidated c420ui core contract check
  - covers package and dependent-project boundaries, package policy, public API exports, bridge, detection,
    Action Engine, CLI, root provider, command runner, operational logs, artifact workflow runner, and
    interactive action runner contracts
- `npm run check:canva-linux`
  - runs `check-canva-linux-contracts.ts` as the consolidated Canva Linux contract check
  - covers the adapter, root provider, c420ui sudo helper, public branding, project boundary, action registry
    validation, artifact recipes, AppImage, Flatpak, release artifacts, builder command/session logs, and interactive log
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
- Confirm `Release: v0.1.4-15.Dev.6` appears in current release docs.
- Confirm AppImage, Flatpak, tarball and checksum release docs preserve real generated file names.
- Confirm root authentication prompts only for privileged actions.
- Confirm Secret Service-backed persistent login and ephemeral session policy remain documented.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.
