# Logging Contract

Canva Linux logging is infrastructure and must not crash the Electron main process.

## Core contract

- Public debug modes must remain `canva-linux --debug=1` and `canva-linux --debug=2`.
- Runtime logging must remain centralized in `logs/current.log`.
- Logger argument handling must be crash-safe for arbitrary values.

## Safe argument normalization

The logger must normalize arguments one by one.

Do not serialize the full `args` array directly with:

```js
JSON.stringify(args)
```

Logging must never crash the Electron main process.

The logger must safely handle:

- circular objects
- BigInt values
- Error instances
- Function values
- Symbols
- arbitrary Electron objects
- undefined and null values

Use the shared normalization helpers:

- `normalizeLogArg(arg)`
- `normalizeArgs(args)`
- `createLogSignature(args)`

If serialization fails, the logger must emit a safe placeholder instead of throwing.
