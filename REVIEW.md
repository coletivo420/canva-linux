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

## Validation split review

Request changes if a PR:

- adds new c420ui checks to the legacy tooling block;
- adds Canva Linux concrete artifact checks to c420ui core checks;
- bypasses `check:c420ui-core`, `check:canva-linux` or `check:shared-tooling`;
- expands `check:legacy-tooling` without explaining why the check cannot yet live in its final domain.

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
