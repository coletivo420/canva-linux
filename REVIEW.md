# Review Checklist

## Agent policy review

Request changes if a PR:

- turns `CLAUDE.md`, `.codex`, or `GEMINI.md` into public user documentation;
- skips required reading from agent maintenance policy files;
- removes or weakens rules from `docs/internal/AI_GUARDRAILS.md`;
- removes validations or review checklist items to make a change pass;
- fails to report validations executed and anything not tested.

## Versioning review

Request changes if a PR:

- changes version `0.1.4-12` without an explicit maintainer request;
- introduces `0.1.4-12.RC2`;
- publishes four-number dotted release identities instead of the npm-compatible package version;
- hardcodes release asset architecture names instead of preserving generated names such as `x86_64` or `X86_64`.

## Canva Linux config boundary review

Request changes if a PR:

- reintroduces `scripts/actions.json`;
- reintroduces `scripts/project-ui.json`;
- reintroduces `scripts/core/action-registry.ts`;
- reintroduces `scripts/core/validate-actions.ts`;
- puts project-specific registry loading inside `packages/c420ui/src`;
- hardcodes Canva Linux config paths inside c420ui core.

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
- reimplements c420ui engines in `scripts/c420ui-canva-linux`;
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

- breaks `bash -n canva-linux.sh`;
- hardcodes project action flags in the launcher parser;
- routes direct CLI actions around `run-c420ui-cli.js`;
- removes `--dry-run` propagation from the launcher;
- allows multiple direct action flags in one invocation.

## Launcher freshness review

Request changes if a PR:

- lets `canva-linux.sh` execute a stale `.build/scripts/run-c420ui-cli.js`;
- removes freshness coverage for `packages/c420ui/src`;
- removes freshness coverage for `scripts/c420ui-canva-linux`;
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
- introduces new direct CLI validation paths outside `./canva-linux.sh` or `npm run c420ui:cli`;
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

- reintroduces `scripts/c420ui/`;
- adds generic terminal UI code under `scripts/`;
- hardcodes Canva Linux metadata inside `packages/c420ui/src/terminal`;
- calls `scripts/run-core-entry.sh overview-status` from terminal UI;
- imports Canva Linux adapters from c420ui terminal code;
- makes `scripts/c420ui-canva-linux/` contain generic UI logic.

## Host dependency ownership review

Request changes if a PR:

- hardcodes Canva Linux dependency names inside `packages/c420ui/src`;
- calls `scripts/ensure-npm-dependencies.sh` directly from project launchers or generic c420ui code;
- runs `npm ci` or `npm install` directly from project launchers;
- moves project dependency lists into c420ui core instead of project config;
- moves npm dependency policy back into project shell helpers.
