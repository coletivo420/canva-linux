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
