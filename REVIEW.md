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

## Action Runner review

Request changes if a PR:

- sources action metadata from anywhere other than `scripts/actions.json`;
- duplicates action logic in c420ui or launcher code;
- changes Action Runner root or planned-action behavior without explicit maintainer direction;
- ignores `action.env` from `scripts/actions.json`;
- makes c420ui and direct CLI behavior diverge for `system` or `user` scope actions;
- bypasses `scripts/sudo-common.sh` for system-wide actions.


## c420ui root provider review

Request changes if a PR:

- imports root/sudo helpers from the legacy Action Runner into the Canva Linux adapter;
- triggers sudo for dry-run, planned actions, or confirmation failures;
- calls sudo directly from `packages/c420ui/src`;
- bypasses `scripts/sudo-common.sh` for Canva Linux privileged actions;
- removes user-scope protection for root actions.

## c420ui action engine review

Request changes if a PR:

- duplicates planned-action behavior outside the c420ui action engine;
- duplicates dry-run behavior outside the c420ui action engine;
- routes direct CLI actions around the c420ui Action Engine;
- adds Canva Linux-specific metadata to `packages/c420ui/src/action-engine.ts`;
- changes runtime app logs while implementing action-engine contracts.

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
- removes the legacy Action Runner before compatibility checks are migrated.

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
- reintroduces direct `spawn()` action execution in `scripts/c420ui/app.ts`;
- bypasses the c420ui root provider for interactive privileged actions;
- triggers sudo before confirmation or for dry-run/planned actions;
- reintroduces `C420UISudoProvider` as a separate root abstraction.
## Standalone check cleanup review

Request changes if a PR:

- adds a new standalone check under `scripts/core` for c420ui or Canva Linux behavior;
- adds a check to `build:scripts-core` that is not part of shared repository infrastructure;
- duplicates a rule already covered by `check-c420ui-core-contracts.ts`, `check-canva-linux-contracts.ts` or `check-repository-policy.ts`;
- reintroduces old standalone validation aliases.
