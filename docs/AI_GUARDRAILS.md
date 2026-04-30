# AI Guardrails

These guardrails exist to prevent regressions in Canva Linux runtime behavior.

## Changelog-backed non-regression rule

CHANGELOG.md is a source of protected project history.

Features, behaviors, workflows, validations, scripts, permissions, logging contracts, debug contracts, packaging decisions, and runtime integrations documented in `CHANGELOG.md` are established project behavior.

AI-generated patches must not remove, weaken, bypass, rename, silently alter, or "simplify away" behavior already established in `CHANGELOG.md` unless the user or maintainer explicitly requests that change.

If a change intentionally replaces or removes a previously established behavior, the patch must:

- state the reason in `CHANGELOG.md`;
- update the relevant documentation;
- preserve or replace test coverage;
- describe the migration path when user-facing behavior changes.

If a feature looks redundant but appears in `CHANGELOG.md`, treat it as intentional until proven otherwise.

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

## TypeScript runtime build guardrails

AI-generated patches must not bypass the TypeScript runtime build pipeline after DEV12.

Rules:

- Do not point `package.json#main` back to `electron/main/index.js`.
- Do not package raw `electron/**/*` as the primary runtime after DEV12.
- Do not commit `.build/`.
- Do not edit generated preload bundles manually.
- Do not convert files to `.ts` before the build pipeline is validated.
- Do not move runtime build before source validation in `scripts/validate-project.sh`.
- Preserve runtime behavior documented in `CHANGELOG.md`.

The runtime entrypoint after DEV12 is:

```text
.build/electron/main/index.js
```

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

## Flatpak scope guardrails

AI-generated patches must not reintroduce unconditional user-scoped Flatpak installation.

Forbidden by default:

```bash
flatpak remote-add --if-not-exists --user flathub
flatpak install -y --user flathub
flatpak-builder --user --install
sudo flatpak-builder
$(flatpak_scope_prefix) flatpak-builder
```

Default local install scope is system.

AI-generated patches must not run `flatpak-builder` with `sudo`.

Administrator authorization should be deferred to system Flatpak operations whenever possible.

System-scope local installs should build as the current user, then use `sudo flatpak` only for the local remote and app install operations that write to the system Flatpak installation.

The installer must explain that system-scope installation makes Canva Linux available to all users and avoids creating a duplicate user Flatpak scope.

User scope is allowed only when explicitly requested through:

```bash
CANVA_FLATPAK_SCOPE=user
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install
```

User-scoped installs may duplicate Flathub remotes, runtimes, SDKs, BaseApps and apps already installed in the system Flatpak scope.

Do not revert the default install flow to `--user` only to avoid an administrator prompt.

Development runs should prefer:

```bash
./canva-linux.sh --run-dev
```

to avoid installing local origins during quick testing.
