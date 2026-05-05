# Review Checklist

## Logging review checklist

Reject or request changes if a PR:

- uses `JSON.stringify(args)` without safe wrapping
- serializes arbitrary logger arguments as a whole array
- removes `normalizeLogArg`
- removes `normalizeArgs`
- removes circular-object handling
- removes BigInt handling
- allows logging to throw from the main process
- reintroduces `CANVA_DEBUG=gpu` or other module-specific public debug modes
- creates a second log file without explicit request

## Changelog-backed regression review

Request changes if a PR:

- removes behavior documented in `CHANGELOG.md`;
- weakens behavior documented in `CHANGELOG.md`;
- renames public commands, environment variables, scripts, or files documented in `CHANGELOG.md` without migration notes;
- removes tests for behavior documented in `CHANGELOG.md`;
- removes documentation for behavior documented in `CHANGELOG.md`;
- describes a behavior as obsolete only because it looks verbose or complex.

Accept removal only when the user or maintainer explicitly requested it and the PR updates `CHANGELOG.md`.

## CL-EyeDropper review checklist

Request changes if a PR:

- bypasses the bundled CL-EyeDropper snapshot canvas flow;
- replaces typed `EyeDropperOpenOptions` signal handling with `any` casts;
- removes cleanup of the snapshot host, CL-EyeDropper UI, or Escape/abort listeners;
- removes regression tests for snapshot picking and cleanup.

## Repository inventory

The generated file inventory belongs in `docs/REPOSITORY_INVENTORY.md`. Do not replace this checklist with generated inventory output.
