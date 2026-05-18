# Review Checklist

## c420ui bootstrap generated artifact review

- bootstrap/c420ui/*.cjs are generated artifacts. Do not edit them manually.
  Any behavioral change must be made in TypeScript sources and then propagated through npm run build:c420ui-bootstrap.
- The c420ui bootstrap check must fail if run-c420ui.cjs has syntax errors, stale generated output,
  malformed SIGCONT blocks, or host-dependency validators interleaved into the interactive action runner.
- Dev.8 hotfix: c420ui bootstrap artifacts now have an explicit artifact gate that validates node --check,
  known structural corruption patterns, generated-vs-recipe equality, and manifest/build-metadata consistency.
- Reject changes that treat `bootstrap/c420ui/*.cjs` as source of truth, must not restore `canva-linux.sh`,
  or bypass the official TypeScript bootstrap build recipe.
- Dev.8 adds an explicit c420ui node --check gate and a strict artifact gate.
  `check:c420ui-bootstrap-artifacts` is a verification gate, not a regeneration command: it must not run
  `npm run build:metadata` or `npm run build:c420ui-bootstrap` against the worktree before validating artifacts.
  It generates expected c420ui bootstrap artifacts in a temporary directory, compares them byte-for-byte with
  committed artifacts, fails when committed artifacts are stale, and requires `git diff --exit-code` to pass after the gate.
  To regenerate committed artifacts intentionally, run `npm run build:metadata`, `npm run build:scripts`, and
  `npm run build:c420ui-bootstrap`, then rerun the artifact gate.


## Dev.8 pinned home tab-strip guardrail

- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model, but it must be rendered
  by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar. Do not change BrowserWindow title logic,
  native title handling, OAuth, credential storage, GPU diagnostics, or c420ui metadata/bootstrap logic for this feature.
- Do not render the home tab twice: regular tab state must exclude home, the pinned home control is the only visible
  home-return control, and it must send `go-home`.


`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
See [c420ui Builder Alias Policy](docs/c420ui/BUILDER_ALIAS.md).

## Dev.7 OAuth completion review

Request changes if a PR preparing `0.1.4-15.Dev.8` OAuth completion:

- reloads a generic active tab instead of resolving the tab that opened the OAuth popup by `sourceWebContentsId`;
- closes the popup or reloads the source tab before an authorized Canva callback is finalized by callback type, the
  persistent session flush has completed, and the documented post-flush settle guard has run;
- depends on exact callback URL string equality instead of treating `/oauth/authorized/...` URLs as authorized callbacks by type;
- omits the guarded authorized-callback fallback timer for redirect sequences where Electron reports the callback in
  navigation events without a matching `did-finish-load`;
- allows the OAuth fallback to close the popup while the authorized callback WebContents is still loading, except after the
  bounded max-attempt safety limit;
- omits the safe `oauth-cookie-summary` diagnostics for `https://www.canva.com` when the Electron cookies API is available;
- logs cookie values, OAuth `code`, `state`, tokens, session IDs, or other sensitive callback material;
- removes the fallback to the active tab when the source webContents id cannot be resolved, or fails to log that fallback;
- uses plain `reload()` when `reloadIgnoringCache()` is available for the post-OAuth source-tab reload;
- allows duplicate authorized callback signals to close or reload the same popup more than once.

## Dev.6 cleanup handoff review

Request changes if a PR closing `0.1.4-15.Dev.8`:

- describes Dev.6 as feature expansion instead of post-migration cleanup;
- omits the dead-code audit, obsolete validation-contract cleanup, streamlined smoke tests, runtime CLI diagnostics cleanup,
  or GPU/display `runtime-options` logging from the handoff narrative;
- weakens active behavior boundaries such as valued runtime CLI `--option=value` parsing;
- reduces GPU/display diagnostics to source-only logging instead of selected runtime CLI option values;
- expands builder smoke coverage beyond the lean help, planned-action dry-run, runtime-flag rejection, runtime name,
  and App ID surface without an explicit maintainer request;
- opens Dev.7 work, including OAuth reload implementation, before Dev.6 is merged.

## Agent policy review

Request changes if a PR:

- turns `CLAUDE.md`, `.codex`, or `GEMINI.md` into public user documentation;
- skips required reading from agent maintenance policy files;
- removes or weakens rules from `docs/internal/AI_GUARDRAILS.md`;
- removes validations or review checklist items to make a change pass;
- fails to report validations executed and anything not tested.

## RC validation matrix review

Request changes if a PR preparing `0.1.4-15.Dev.8` for cleanup handoff validation:

- removes `docs/internal/RC_VALIDATION_MATRIX.md`;
- fails to link the RC validation matrix from maintained release or validation documentation;
- omits any required command, manual RC validation, expected result, owner domain, or release blocker from the matrix;
- marks `v0.1.4-15.Dev.8` ready while a release blocker remains open.

## Standalone c420ui bootstrap validation

The `0.1.4-14` RC validation confirmed that the committed c420ui bootstrap bundle can start without local `node_modules`,
local `esbuild`, or launcher-side npm installation.

Validated guarantees:

- `c420uiVersion` remains independent from the Canva Linux dependent-project version.
- `dependentProjectVersion` remains `0.1.4-14`.
- `bootstrap/c420ui/manifest.json` sourceHash matches current TypeScript sources and project configuration.
- Stale sourceHash detection fails as expected when bootstrap inputs are edited without rebuilding.
- The launcher does not run `npm install` or `npm ci`.
- Full dependency validation and repair remain owned by c420ui after startup.

Direct `./canva-linux-c420ui-builder` startup was blocked in the validation container because it runs as root and the launcher correctly refuses root execution.

## Runtime CLI review

Request changes if a PR:

- reintroduces `CANVA_DEBUG` or `CANVA_DEBUG_LEVEL` as runtime debug input;
- reintroduces `CANVA_LINUX_PASSWORD_STORE` as the public credential-store override;
- adds `--canva-debug=1` or `--canva-debug=2` to `canva-linux-c420ui-builder`;
- accepts module-specific debug values instead of only `--canva-debug=1` and `--canva-debug=2`;
- allows `--debug` or `--debug=*` as a supported Canva Linux runtime flag instead of reserving it for Electron/Node;
- allows `basic_text` as persistent credential storage;
- weakens active `--option=value` boundary coverage for valued runtime CLI flags;
- reduces GPU diagnostics to source-only logging instead of selected `gpuBackend`, `forceX11`, `forceWayland`,
  `disableWaylandColorManager`, and `displayOverride` values.

Runtime diagnostics are exposed through the compiled Canva Linux CLI only. The c420ui installer/development launcher does not own runtime debug flags.

## Versioning review

Request changes if a PR:

- changes version `0.1.4-15.Dev.8` without an explicit maintainer request;
- introduces `0.1.4-dev.15`, `0.1.4-rc.15`, `0.1.4.15`, `0.1.4-15.dev.1`, or `0.1.4-15.Dev.01`;
- publishes four-number dotted release identities instead of the npm-compatible package version;
- hardcodes release asset architecture names instead of preserving generated names such as `x86_64` or `X86_64`.

## Canva Linux config boundary review

Request changes if a PR:

- reintroduces `scripts/actions.json`;
- reintroduces `scripts/project-ui.json`;
- reintroduces `scripts/core/action-registry.ts`;
- reintroduces `scripts/core/validate-actions.ts`;
- puts project-specific registry loading inside `packages/c420ui/src`;
- hardcodes Canva Linux config paths inside c420ui core;
- moves `actions.json`, `development.json`, or `artifacts.json` declarations out of `config/canva-linux` without an explicit migration.

## Removed Action Runner review

Request changes if a PR:

- reintroduces `scripts/core/action-runner.ts`;
- reintroduces `check:legacy-compat`;
- documents `scripts/run-core-entry.sh action-runner` as an execution path;
- duplicates Action Engine, Root Provider, or Command Runner policy outside c420ui;
- uses Action Runner terminology for new code.

## Dependent project boundary review

Request changes if a PR:

- adds project-specific strings to `packages/c420ui/src`;
- imports project adapters from c420ui;
- reimplements c420ui engines in `scripts/c420ui-adapter`;
- turns `scripts/c420ui-adapter` into a planned-action, dry-run, root, sudo, or confirmation policy layer;
- adds root launch guard outside c420ui terminal runtime;
- hardcodes concrete Canva Linux action IDs in c420ui core;
- moves project detection or package recipes into c420ui core.

## c420ui root provider review

Request changes if a PR:

- imports root/sudo helpers from removed legacy runner surfaces into the Canva Linux adapter;
- triggers sudo for dry-run, planned actions, or confirmation failures;
- calls sudo directly from `packages/c420ui/src`;
- bypasses `packages/c420ui/host/linux/sudo-helper.sh` for Canva Linux privileged actions;
- removes user-scope protection for root actions.

## c420ui scope/root provider boundary review

Request changes if a PR:

- reimplements generic scope helpers inside Canva Linux code;
- hardcodes `CANVA_NATIVE_SCOPE`, `CANVA_FLATPAK_SCOPE` or `C420UI_ROOT_AUTH` in c420ui core;
- hardcodes `packages/c420ui/host/linux/sudo-helper.sh` in c420ui core;
- reimplements `validateRootAccess` in the Canva Linux root provider;
- moves conditional Canva Linux detection policy into c420ui core.

## c420ui host sudo helper review

Request changes if a PR:

- reintroduces the removed project-specific sudo helper;
- adds project-specific sudo helper function aliases;
- adds `CANVA_*` env vars to `packages/c420ui/host`;
- bypasses the c420ui Linux root provider base;
- calls raw sudo outside the c420ui sudo helper.

## c420ui action engine review

Request changes if a PR:

- duplicates planned-action behavior outside the c420ui action engine;
- duplicates dry-run behavior outside the c420ui action engine;
- routes direct CLI actions around the c420ui Action Engine;
- adds Canva Linux-specific metadata to `packages/c420ui/src/action-engine.ts`;
- changes runtime app logs while implementing action-engine contracts.

## Adapter and shell helper review

Request changes if a PR:

- restores planned-action or dry-run fallback handling in a dependent-project adapter;
- calls `adapter.runAction()` directly instead of routing through the c420ui Action Engine;
- duplicates root or confirmation policy outside the c420ui Action Engine and root provider;
- restores the obsolete npm dependency bootstrap script;
- adds npm install, repair, or skip policy to `scripts/preflight-common.sh`;
- leaves shell helper classifications in `docs/checks/SHELL_HELPERS.md` stale.

## Artifact workflow runner review

Request changes if a PR:

- hardcodes Canva Linux action IDs inside c420ui core;
- implements build/install/release phase routing in the Canva Linux adapter instead of c420ui;
- reports planned package workflows as success;
- changes artifact architecture naming to x64;
- bypasses Action Engine / Command Runner for artifact actions.

## Artifact workflow execution review

Request changes if a PR:

- calls `adapter.runAction()` directly from artifact workflow orchestration;
- bypasses the c420ui Action Engine for artifact phases;
- bypasses the Canva Linux Root Provider for system install/uninstall/purge phases;
- makes planned package workflows return success as if implemented;
- triggers sudo during dry-run.

## c420ui split audit review

Request changes if a PR:

- uses a project-specific c420ui adapter directory name instead of `scripts/c420ui-adapter/`;
- reintroduces `scripts/c420ui/`;
- puts generic terminal UI outside `packages/c420ui/src/terminal/`;
- adds runtime or product entrypoints under `scripts/core`;
- leaves active docs pointing to removed runtime paths;
- hardcodes Canva Linux action IDs, config paths, app IDs, shell scripts, or `CANVA_` variables inside `packages/c420ui/src`.

## c420ui naming and logo review

Request changes if a PR:

- uses `C420UI` as public branding;
- reintroduces `Terminal Assistant` or `TUI` as product names;
- changes the approved three-line c420ui logo without maintainer request;
- removes the lowercase `c420ui` identity from help, docs or headers;
- uses `C420UI_LOGO_LINES` in new code instead of `c420uiLogoLines`.

## Docs/changelog review

Request changes if a PR:

- turns auxiliary agent policies into public docs;
- leaves active docs out of sync with the current version, phase, or validation flow;
- removes `docs/RELEASE.md` as the source for GitHub Release notes;
- puts long command references in README instead of `docs/CLI.md`.

## Language and future i18n review

Request changes if a PR:

- adds maintained source, comments, UI strings, README, docs, changelog, or AI maintenance instructions in a language other than English;
- adds Portuguese comments, Portuguese docs, Portuguese UI strings, or mixed-language source text;
- hardcodes future translations directly in runtime code;
- introduces user-facing translations without an explicit i18n architecture, structured translation resources, typed keys, and fallback language rules.

## Validation surface review

Request changes if a PR:

- adds a new single-purpose check without strong justification;
- reintroduces the removed legacy tooling script;
- adds new aliases for old check names;
- expands validation with duplicate checks instead of extending the consolidated domain check;
- puts Canva Linux-specific assertions in c420ui core checks;
- bypasses `check:c420ui-core`, `check:canva-linux` or `check:shared-tooling`.

## Consolidated validation review

Request changes if a PR:

- creates a new `*-parts/` validation directory;
- splits a small assertion into a new one-off check file;
- adds imports from old check fragments;
- expands validation with duplicate checks instead of extending the consolidated domain runner.

## Changelog-backed regression review

Request changes if a PR:

- changes behavior without updating `CHANGELOG.md`;
- removes behavior documented in `CHANGELOG.md`;
- weakens behavior documented in `CHANGELOG.md`;
- renames public commands, environment variables, scripts, or files documented in `CHANGELOG.md` without migration notes;
- removes tests for behavior documented in `CHANGELOG.md`;
- removes documentation for behavior documented in `CHANGELOG.md`;
- describes a behavior as obsolete only because it looks verbose or complex;
- replaces this checklist with generated repository inventory output.

Accept removal only when the user or maintainer explicitly requested it and the PR updates `CHANGELOG.md`.

## Credential storage review checklist

Request changes if a PR:

- allows `basic_text` to use `persist:canva`;
- removes ephemeral fallback for insecure credential storage;
- removes the user warning for ephemeral sessions;
- claims persistent login works without Secret Service;
- claims persistent login works without a secure native credential store and available safeStorage encryption;
- omits the automatic desktop-aware Flatpak credential order: KDE/Plasma tries KWallet first,
  the alternate KWallet generation second, and Secret Service/libsecret third; GNOME and unknown desktops try
  Secret Service/libsecret first, then KWallet6 and KWallet5;
- logs cookies, tokens, passwords or credential material.

## c420ui root launch guard review

Request changes if a PR:

- adds `process.getuid()` root-launch checks outside `packages/c420ui/src/terminal`;
- reintroduces `adapter.rootLaunchGuardMessage()`;
- formats c420ui terminal help inside the Canva Linux adapter;
- executes `packages/c420ui/src/terminal/index.ts` as a runtime entrypoint;
- bypasses `runC420UITerminalApp()` for terminal startup.

## Logging review checklist

Reject or request changes if a PR:

- uses `JSON.stringify(args)` without safe wrapping;
- serializes arbitrary logger arguments as a whole array;
- removes `normalizeLogArg`;
- removes `normalizeArgs`;
- removes circular-object handling;
- removes BigInt handling;
- allows logging to throw from the main process;
- reintroduces `CANVA_DEBUG=gpu` or other module-specific public debug modes;
- creates a second log file without explicit request.

## CL-EyeDropper review checklist

Request changes if a PR:

- bypasses the bundled CL-EyeDropper snapshot canvas flow;
- replaces typed `EyeDropperOpenOptions` signal handling with `any` casts;
- removes cleanup of the snapshot host, CL-EyeDropper UI, or Escape/abort listeners;
- removes regression tests for snapshot picking and cleanup.

## Repository inventory

The generated file inventory belongs in `docs/internal/REPOSITORY_INVENTORY.md`. Do not replace this checklist with generated inventory output.

## c420ui CLI bridge review

Request changes if a PR:

- routes direct CLI actions around the c420ui Action Engine;
- allows multiple direct actions in a single launcher invocation;
- allows dangerous or confirmation-required direct actions without `--yes`;
- bypasses root/sudo preflight before privileged direct actions;
- drops stdout/stderr from direct CLI action scripts;
- changes planned action exit code `78`;
- breaks planned action dry-run exit code `0`;
- reintroduces `C420UI` branding in launcher help;
- restores removed legacy action execution surfaces or compatibility checks.

## Launcher parser review

Request changes if a PR:

- breaks `bash -n canva-linux-c420ui-builder`;
- hardcodes project action flags in the launcher parser;
- routes direct CLI actions around `run-c420ui-cli.js`;
- removes `--dry-run` propagation from the launcher;
- allows multiple direct action flags in one invocation.

## Launcher freshness review

Request changes if a PR:

- lets `canva-linux-c420ui-builder` execute a stale `.build/scripts/run-c420ui-cli.js`;
- removes freshness coverage for `packages/c420ui/src`;
- removes freshness coverage for `scripts/c420ui-adapter`;
- tests launcher behavior by executing real destructive actions instead of a stub.

## c420ui command runner review

Request changes if a PR:

- reimplements generic `spawn()` handling inside a project adapter;
- drops partial stdout/stderr chunks;
- hides command stderr from CLI or c420ui logs;
- changes runtime Electron logs while modifying c420ui command execution;
- reintroduces `scripts/c420ui/process-runner.ts` as an action execution path.

## Operational log policy review

Request changes if a PR:

- emits command stdout/stderr without c420ui redaction;
- logs token, password, secret or bearer values in operational logs;
- reimplements cancellation in a project adapter;
- prepares action env inside a project adapter after root provider migration;
- changes Electron runtime logs while touching c420ui operational command logs.

## Interactive c420ui action engine review

Request changes if a PR:

- makes direct CLI and interactive c420ui use different execution policies;
- reintroduces direct `spawn()` action execution in `packages/c420ui/src/terminal/app.ts`;
- bypasses the c420ui root provider for interactive privileged actions;
- triggers sudo before confirmation or for dry-run/planned actions;
- reintroduces `C420UISudoProvider` as a separate root abstraction.

## Removed legacy runner wording review

Request changes if a PR:

- documents removed legacy runner commands as an execution path;
- introduces new direct CLI validation paths outside `./canva-linux-c420ui-builder` or `npm run c420ui:cli`;
- adds new compatibility checks for removed legacy runner surfaces;
- documents c420ui separation as incomplete when the relevant boundary already exists.

## Standalone check cleanup review

Request changes if a PR:

- adds a new standalone check under `scripts/core` for c420ui or Canva Linux behavior;
- adds a check to `build:scripts-core` that is not part of shared repository infrastructure;
- duplicates a rule already covered by `check-c420ui-core-contracts.ts`, `check-canva-linux-contracts.ts` or `check-repository-policy.ts`;
- reintroduces old standalone validation aliases.

## Consolidated runner quality review

Request changes if a PR:

- reintroduces `*-parts` validation directories;
- keeps historical `Part` naming in consolidated runners;
- adds a c420ui source module without updating the public API contract;
- adds a module to `packages/c420ui/src` without exporting or documenting it.

## Detection boundary review

Request changes if a PR:

- reintroduces `scripts/core/overview-status.ts`;
- puts Canva Linux detection keys inside `packages/c420ui/src`;
- imports detection from `scripts/core`;
- bypasses the c420ui detection engine for root policy decisions;
- hardcodes Canva Linux metadata inside c420ui core.

## Detection provider shape review

Request changes if a PR:

- reintroduces `status.package` in detection status;
- adds Canva Linux keys to `packages/c420ui/src/detection.ts`;
- bypasses c420ui detection contracts in root policy;
- makes detection async without updating root policy callers safely.

## c420ui terminal package boundary review

Request changes if a PR:

- uses a project-specific c420ui adapter directory name instead of `scripts/c420ui-adapter/`;
- reintroduces `scripts/c420ui/`;
- adds generic terminal UI code under `scripts/`;
- hardcodes Canva Linux metadata inside `packages/c420ui/src/terminal`;
- calls `scripts/run-core-entry.sh overview-status` from terminal UI;
- imports Canva Linux adapters from c420ui terminal code;
- makes `scripts/c420ui-adapter/` contain generic UI logic.

## Host dependency ownership review

Request changes if a PR:

- hardcodes Canva Linux dependency names inside `packages/c420ui/src`;
- calls `scripts/ensure-npm-dependencies.sh` directly from project launchers or generic c420ui code;
- runs `npm ci` or `npm install` directly from project launchers;
- moves project dependency lists into c420ui core instead of project config;
- moves npm dependency policy back into project shell helpers.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging,
maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.

## Builder rename checklist

- [x] Internal builder paths use `c420ui-builder`.
- [x] Public alias remains `canva-linux-c420ui-builder`.
- [x] Legacy `canva-linux.sh` is removed.
- [x] Runtime remains `canva-linux`.
- [x] No `canva-linux-c420ui-builder.cjs` bootstrap artifact remains.

## Dev.7 review note: effective versions and OAuth fallback

- Source identity remains `0.1.4-15.Dev.8` / `0.1.4-15.Dev` / `0.1.4-15.Dev.8`.
- Effective runtime identity appends deterministic `+g<short-hash>` metadata generated during builds.
- The OAuth post-login reload preserves the source tab URL by default; canonical home is only a one-shot fallback after localized public landing detection.
- Runtime metadata fallback must be neutral `0.0.0`/`unknown`; request changes if `electron/main/build-metadata.ts`
  hardcodes the current Dev.7 phase as a fallback.
- Generated build metadata must be normalized before use so partial metadata cannot produce broken effective version strings.
- Localized OAuth landing probes may log only `loginLinks`, `signupLinks`, and `authButtons` counts; request changes if DOM
  text, `aria-label`, `href`, or `data-testid` values are logged.
- c420ui remains `0.1.0` and independent; future c420ui build metadata should be added in its own project phase.
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
