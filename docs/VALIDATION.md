# Validation Checklist (0.1.4-15.Dev.9)

## Dev.9 metadata persistence and c420ui repair

Dev.9 now requires compiled/package outputs to leave effective build metadata behind. Native installs place
config/canva-linux/build-metadata.json in the install prefix, while AppImage and Flatpak bundle artifacts write
<artifact>.build-metadata.json sidecars. Artifact filenames may keep the base package version; hash-visible display
comes from metadata.

Dev.9 generated artifact detection is now registry-driven from `config/canva-linux/artifacts.json` and must not be
limited to AppImage. Generated artifact detection must list all declared registry workflows, including planned workflows
without `outputPattern` as not detected. Produced package outputs should leave effective build metadata via installed
markers or sidecars, and c420ui must prefer that metadata when displaying artifact versions.

All TypeScript modules consumed by c420ui for project integration, overview detection, artifact fragments, build metadata
resolution, and bootstrap recipes must live under `scripts/c420ui-adapter`. Do not add new c420ui integration modules
under `scripts/canva-linux`. `npm run check:canva-linux` enforces that c420ui integration modules do not return to
`scripts/canva-linux`.

The c420ui input dialog must close via textbox cancel using setImmediate, keeping overlay Escape as fallback and avoiding redundant textbox Escape handlers.

- Native User: detected v0.1.4-15.Dev.9+g...
- AppImage: detected v0.1.4-15.Dev.9+g...
- Flatpak System/User continuam exibindo +gHASH.

Verify metadata installation:
```bash
CANVA_NATIVE_SCOPE=user bash scripts/install-native.sh
test -f "$HOME/.local/opt/canva-linux/config/canva-linux/build-metadata.json"

bash scripts/build-appimage.sh
ls dist/*.AppImage.build-metadata.json

bash scripts/build-flatpak-bundle.sh
ls dist/*.flatpak.build-metadata.json
```


Manual generated artifact validation:

```bash
bash scripts/build-appimage.sh
bash scripts/build-flatpak-bundle.sh
./canva-linux-c420ui-builder
```

Check that c420ui renders generated artifacts from the registry, preferring effective metadata versions:

```text
Generated Artifacts
  Flatpak bundle: detected v0.1.4-15.Dev.9+g...
  AppImage:       detected v0.1.4-15.Dev.9+g...
```

## Dev.8 pinned home tab-strip guardrail

## c420ui bootstrap artifact validation

bootstrap/c420ui/*.cjs are generated artifacts. Do not edit them manually.
Any behavioral change must be made in TypeScript sources and then propagated through npm run build:c420ui-bootstrap.

Dev.8 hotfix: c420ui bootstrap artifacts now have an explicit artifact gate that validates node --check,
known structural corruption patterns, generated-vs-recipe equality, and manifest/build-metadata consistency.
Dev.8 adds an explicit c420ui node --check gate and a strict artifact gate.
`check:c420ui-bootstrap-artifacts` is a verification gate, not a regeneration command: it must not run
`npm run build:metadata` or `npm run build:c420ui-bootstrap` against the worktree before validating artifacts.
It generates expected c420ui bootstrap artifacts in a temporary directory, compares them byte-for-byte with
committed artifacts, fails when committed artifacts are stale, and requires `git diff --exit-code` to pass after the gate.
Committed c420ui bootstrap artifacts validate against committed build metadata in
`config/canva-linux/build-metadata.json`. Source checkout runtime/build metadata may still resolve from Git HEAD when
applicable, but the artifact gate must not rewrite tracked metadata to the current HEAD while validating. This avoids
dirtying the worktree with a not-yet-materialized commit hash.
To regenerate committed artifacts intentionally, run `npm run build:metadata`, `npm run build:scripts`, and
`npm run build:c420ui-bootstrap`, then rerun the artifact gate.

The c420ui bootstrap check must fail if run-c420ui.cjs has syntax errors, stale generated output,
malformed SIGCONT blocks, or host-dependency validators interleaved into the interactive action runner. Validate this with:

- `node --check bootstrap/c420ui/run-c420ui.cjs`
- `node --check bootstrap/c420ui/run-c420ui-cli.cjs`
- `node --check bootstrap/c420ui/c420ui-builder.cjs`
- `npm run check:c420ui-node-check`
- `npm run check:c420ui-bootstrap`
- `npm run check:c420ui-bootstrap-artifacts`
- `npm run test -- test/c420ui-bootstrap-artifacts.test.ts`

Bootstrap PR logs must include these exact success lines after regenerating bootstrap artifacts:

```text
[ok] node --check bootstrap/c420ui/run-c420ui.cjs
[ok] node --check bootstrap/c420ui/run-c420ui-cli.cjs
[ok] node --check bootstrap/c420ui/c420ui-builder.cjs
[ok] npm run check:c420ui-bootstrap-artifacts
```


- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model, but it must be rendered
  by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar. Do not change BrowserWindow title logic,
  native title handling, OAuth, credential storage, GPU diagnostics, or c420ui metadata/bootstrap logic for this feature.
- Do not render the home tab twice: regular tab state must exclude home, the pinned home control is the only visible
  home-return control, and it must send `go-home`.


`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](c420ui/BUILDER_ALIAS.md).

Current target:

- Version: `0.1.4-15.Dev.9 (Alpha)`
- Release: `v0.1.4-15.Dev.9`
- Versioning rule: `N.N.N-X` with optional `.Dev.N` development phase suffixes

## Detected Installations version visibility

The c420ui `Detected Installations` panel must prefer detected effective/hashed version fields (`*FullVersion`) when
they are available, then fall back to the base detected version fields for older native, Flatpak, or AppImage markers.
For example, a Flatpak system install with build metadata should render `v0.1.4-15.Dev.9+g<hash>`, while a legacy marker
that only exposes `version` should continue rendering `v0.1.4-15.Dev.9`.

## Release metadata checks

The validation baseline protects these release facts:

- `package.json` version is `0.1.4-15.Dev.9`.
- `package-lock.json` top-level version is `0.1.4-15.Dev.9`.
- `package-lock.json` root package version is `0.1.4-15.Dev.9`.
- `data/io.github.coletivo420.canva-linux.metainfo.xml` contains release `0.1.4-14`.
- Active release docs point to `v0.1.4-15.Dev.9`.
- Forbidden release identities include `0.1.4-dev.14`, `0.1.4-rc.14`, and `0.1.4.14`.

## Validation tiers

Validation is layered so fast behavioral checks stay close to the code while handoff-only work remains explicit. Dev.6 closes the
post-migration cleanup phase by combining dead-code audit evidence, obsolete validation-contract cleanup, streamlined smoke tests,
runtime CLI diagnostics cleanup, and GPU/display `runtime-options` logging:

1. **Fast unit tests**
   - Cover parsers, the runtime CLI, `normalizeBuilderArgs`, credential-store selection, and small behavior-focused helpers.
2. **Lightweight contract checks**
   - Protect current entrypoints, package identity, App ID, runtime executable name, bootstrap manifest entrypoints, and `sourceHash` freshness.
3. **Minimal smoke tests**
   - Exercise `./canva-linux-c420ui-builder --help`, one planned action such as `--prepare-aur --dry-run`,
     one runtime-flag rejection such as `--canva-debug=1`, and runtime `canva-linux --help`.
4. **RC/manual validation**
   - Covers Flatpak, AppImage, credential persistence, OAuth, GPU/display behavior, complete packaging, and release-artifact handoff.

Historical migration checks should be simplified after stabilization. Active behavior boundaries, such as valued runtime
options requiring `--option=value`, must remain covered by contracts and behavioral tests. GPU/display RC validation must
inspect the central log for `gpu:runtime runtime-options`; selected runtime CLI options are active diagnostics and must not
be reduced to source-only logging.

Do not use `--debug`. It is reserved by Electron/Node and may be consumed before Canva Linux receives the arguments.
Use `--canva-debug=1` or `--canva-debug=2`.

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

## OAuth login completion manual validation

Run the Flatpak runtime with Canva debug logging enabled:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

Complete Google login in the OAuth popup. The central log must show the authorized callback finalization sequence without cookie or token values:

```text
popup-canva-callback-detected type=authorized
oauth-authorized-callback-ready
# On slow callback loads before fallback finalization:
# oauth-authorized-callback-fallback-deferred reason=still-loading attempt=...
oauth-finalize-authorized-callback-start
session flush done
oauth-post-flush-settle
oauth-cookie-summary url=https://www.canva.com count=...
close-popup reason=authorized-callback-loaded
reload-source-tab-after-oauth tab=...
did-finish-load https://www.canva.com/...
```

Confirm the reloaded main Canva tab is the OAuth source tab, uses the shared flushed session, and enters authenticated state.
OAuth finalization must be based on the authorized callback type rather than exact callback URL string equality. If Electron
reports an authorized callback during navigation but no matching `did-finish-load` closes the loop, the log should show
`oauth-authorized-callback-fallback-scheduled` and `oauth-authorized-callback-fallback-fired`. On slow callback loads, the
fallback must distinguish the slow load from a missing `did-finish-load` by logging
`oauth-authorized-callback-fallback-deferred reason=still-loading` while the callback WebContents remains loading, and may
only force completion after the bounded max-attempt safety limit. If the source webContents id cannot be resolved, the
fallback to the active tab must be logged with `fallback=true`.

## GPU/display runtime diagnostics manual validation

Run Canva Linux with GPU/display runtime flags and inspect the central log for `gpu:runtime runtime-options`. The expected
line shape is:

```text
gpu:runtime runtime-options source=runtime-cli
gpuBackend=<value> displayOverride=<auto|x11|wayland> forceX11=<bool> forceWayland=<bool> disableWaylandColorManager=<bool>
```

Minimum manual examples:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
flatpak run io.github.coletivo420.canva-linux --canva-debug=2
flatpak run io.github.coletivo420.canva-linux \
  --canva-debug=2 \
  --gpu-backend=software \
  --force-wayland \
  --disable-wayland-color-manager
electron . --gpu-backend=software
electron . --force-wayland
electron . --disable-wayland-color-manager
```

When the software backend is combined with Wayland forcing and Wayland color-manager disabling, the central log must include:

```text
gpu:runtime runtime-options source=runtime-cli gpuBackend=software displayOverride=wayland forceX11=false forceWayland=true disableWaylandColorManager=true
```

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

- Confirm `./canva-linux-c420ui-builder --help` exposes the current builder surface.
- Confirm `./canva-linux-c420ui-builder --prepare-aur --dry-run` exercises one planned-action dry-run without expanding builder smoke coverage.
- Confirm `./canva-linux-c420ui-builder --canva-debug=1` is rejected because runtime flags belong to the compiled runtime app.
- Confirm runtime `electron . --help` and `electron . --canva-debug=1` remain runtime-owned.
- Confirm `flatpak run io.github.coletivo420.canva-linux --debug=1` fails with the reserved Electron/Node flag message before the runtime starts.
- Confirm `Release: v0.1.4-15.Dev.9` appears in current release docs.
- Confirm AppImage, Flatpak, tarball and checksum release docs preserve real generated file names.
- Confirm root authentication prompts only for privileged actions.
- Confirm Secret Service-backed persistent login and ephemeral session policy remain documented.
- Confirm the GPU/display central-log line matches the runtime diagnostics validation section above.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.

## Effective build metadata validation

Validation checks that source versions remain clean and generated effective versions append `+g<short-hash>` when a build
revision is known. Build revisions must come from deterministic commit metadata rather than random values, timestamps, or
counters.

OAuth validation also checks that the first post-OAuth reload targets the current source tab URL and that
`https://www.canva.com/` appears only as the fallback navigation after localized public logged-out landing detection.
## Dev.8 hotfix guardrails

- c420ui must display Canva Linux effective build metadata when `config/canva-linux/build-metadata.json`, CI revision
  variables, or a source checkout `.git` HEAD can provide it; source `package.json` and `project-ui.json` stay free of
  committed `+g<hash>` metadata.
- The c420ui brand version remains independent and comes from `packages/c420ui/package.json`; c420ui-specific
  `0.1.0+g<hash-do-c420ui>` metadata is future work, not part of this hotfix.
- `build:c420ui-bootstrap` must refresh or resolve effective build metadata before writing the bootstrap manifest, including
  dependent project full version, build revision, display version, and phase.
- MediaDevices diagnostics must preserve native receiver binding for `getUserMedia` and `getDisplayMedia`, including detached
  calls, and must not log token/cookie/code/state values.
- Toolbar favicons must respect the internal CSP by rendering only `data:` and `file:` image URLs, falling back instead of
  rendering remote `https:` favicons.
- OAuth localized public-landing probes must normalize both DOM attributes and localized keywords with NFKD so composed and
  decomposed labels are equivalent.
