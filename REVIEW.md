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
- duplicates action logic in C420UI or launcher code;
- changes Action Runner root or planned-action behavior without explicit maintainer direction;
- duplicates planned, dry-run, root, or confirmation policy in command runners or dependent project adapters;
- lets command runners execute anything other than concrete commands after Action Runner policy is applied;
- ignores `action.env` from `scripts/actions.json`;
- makes C420UI and direct CLI behavior diverge for `system` or `user` scope actions;
- bypasses `scripts/sudo-common.sh` for system-wide actions.
- reintroduces npm dependency bootstrap shell entrypoints instead of explicit `npm ci --include=dev`.

## C420UI naming review

Request changes if a PR:

- renames the user-facing terminal interface away from C420UI;
- reintroduces Terminal Assistant or TUI as product names;
- reintroduces shell menus or legacy interface-routing flags;
- hardcodes project-specific metadata in C420UI core;
- merges the C420UI header and project/tool header into one component.

## Docs/changelog review

Request changes if a PR:

- turns auxiliary agent policies into public docs;
- leaves active docs out of sync with the current version, phase, or validation flow;
- removes `docs/RELEASE.md` as the source for GitHub Release notes;
- puts long command references in README instead of `docs/CLI.md`.

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
