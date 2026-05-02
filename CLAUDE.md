# Claude instructions for Canva Linux

Always read:

- `docs/AI_GUARDRAILS.md`
- `docs/LOGGING_CONTRACT.md`
- `docs/FEATURES.md`
- `docs/DEBUGGING.md`

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
