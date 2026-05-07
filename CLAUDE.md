# Claude Maintenance Policy for Canva Linux

This file provides auxiliary maintenance instructions for Claude agents. It is not public user documentation.

Always read:

- `README.md`
- `REVIEW.md`
- `CHANGELOG.md`
- `docs/DEVELOPMENT.md`
- `docs/TYPESCRIPT.md`
- `docs/internal/AI_GUARDRAILS.md`
- `docs/internal/LOGGING_CONTRACT.md`
- `docs/FEATURES.md`
- `docs/DEBUGGING.md`

## Non-regression policy

- Preserve version `0.1.4-12` unless the maintainer explicitly requests a versioning change.
- Do not introduce `0.1.4-12.RC2`.
- Keep c420ui as the user-facing terminal interface name.
- Do not reintroduce Terminal Assistant or TUI as product names.
- Preserve CL-EyeDropper and its bundled snapshot canvas flow.
- Preserve real generated architecture names such as `x86_64` or `X86_64`; do not normalize them to `x64`.
- Do not remove, weaken, bypass, or silently alter validations to make a build pass.
- Report validations executed and anything not tested.

## TypeScript-first policy

- Use TypeScript for maintained Node.js logic.
- Do not add maintained JavaScript source.
- Shell remains reserved for Linux host-operation glue.

## Root and sudo policy

- Do not run or recommend `./canva-linux.sh` as root.
- Prefer shared sudo helpers over direct sudo calls.
- Never log passwords, sudo stdin, cookies, tokens, or credential material.
- Privileged operations must request authentication only when needed.

## Critical logging rule

Do not suggest or approve unsafe logger serialization.

Dangerous:

```js
JSON.stringify(args)
```

Preferred:

```js
normalizeArgs(args)
```

The logger must handle circular objects, BigInt, Error, Function and arbitrary Electron objects without throwing.

## Changelog-backed non-regression

Before approving cleanup or simplification, compare the proposed change against `CHANGELOG.md`.

Do not approve changes that remove, weaken, bypass, or silently alter behavior already documented in `CHANGELOG.md` unless the maintainer explicitly requested that change.

When in doubt, ask for clarification instead of assuming old behavior is disposable.

## Credential storage policy

- Persistent login must require a secure Linux Secret Service backend.
- If Electron reports `basic_text`, Canva Linux must use ephemeral session mode.
- `basic_text` must never use the `persist:canva` partition.
- Ephemeral session mode must warn the user that login, cookies and credentials will not be saved.
- Do not claim credentials are securely stored when the selected backend is `basic_text`.
- Do not log passwords, cookies, tokens, session values or credential material.
