# AI Guardrails

These guardrails exist to prevent regressions in Canva Linux runtime behavior.

## Protected runtime expectations

- Keep `CANVA_DEBUG=1` and `CANVA_DEBUG=2` as the only public debug modes.
- Keep central logging in `logs/current.log`.
- Keep GPU acceleration and diagnostics available in `CANVA_DEBUG=1`.
- Keep Flatpak graphics access (`--device=dri`) intact.
- Keep Canva Linux feature coverage (OAuth, EyeDropper, drag-and-drop, upload/paste/picker flows, and persistent session).

## Logger safety contract

AI-generated changes must not introduce unsafe logging.

Forbidden:

```js
JSON.stringify(args)
```

unless protected by a safe serializer.

Required:

- normalize arguments one by one
- handle circular objects
- handle BigInt
- handle Error
- handle Function
- never let logging throw from the main process

The logger is infrastructure. It must be more stable than the code it observes.

## TypeScript migration guardrails

AI-generated patches must not convert the project wholesale to TypeScript.

The migration is incremental:

1. add JSDoc types;
2. pass `npm run typecheck`;
3. pass `npm run typecheck:strict` for strict islands;
4. preserve runtime behavior;
5. only then consider isolated `.ts` conversion.

Do not change Electron preload packaging or Flatpak behavior as part of type-only changes.

TypeScript changes must update:

- `docs/TYPESCRIPT.md`
- `docs/VALIDATION.md`
- `CHANGELOG.md`
