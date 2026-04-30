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

## OAuth/navigation TypeScript guardrails

AI-generated patches must not weaken OAuth popup behavior.

Do not:

- merge OAuth popups into normal Canva tabs;
- remove shared `persist:canva` session behavior;
- remove external URL safety checks;
- allow unsafe protocols through `shell.openExternal`;
- remove OAuth callback detection;
- reintroduce manual `JSON.stringify()` in logging where the central logger can normalize objects safely.

Navigation and OAuth changes must run:

```bash
npm run typecheck:strict
node --test test/navigation.test.js
node --test test/window-open-policy.test.js
node --test test/oauth-helpers.test.js
```

## Post-install output guardrails

The post-install command guidance must remain concise.

Do not reintroduce module-specific debug commands in the installer output.

Allowed public debug commands:

```bash
CANVA_DEBUG=1
CANVA_DEBUG=2
```

The installer may use terminal colors only when stdout is a TTY, `NO_COLOR` is not set, and `TERM` is not `dumb`.
