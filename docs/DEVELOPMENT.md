# Development

## Requirements

- Node.js >= 22
- npm
- Git
- Flatpak
- flatpak-builder
- desktop-file-utils
- appstreamcli

Flatpak-related tools are required for Flatpak install and `.flatpak` package
generation. Native install and AppImage packaging still require Node.js, npm, Git
and Electron build toolchain dependencies.

## Setup

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
npm ci --include=dev
```

## TypeScript source rules

- All maintained Node.js source code is TypeScript.
- JavaScript is generated output only; do not add maintained `.js` files under `scripts/`, `test/`, configs, or Flathub helper script paths.
- Shell remains shell for host operations such as launcher glue, native/Flatpak install, sudo, purge, XDG integration, and validation that must run before Node.
- New scripts must be TypeScript unless they are shell scripts for those host operations.
- New tests must be TypeScript.
- New configs should be TypeScript when tool-supported.
- Keep the repository free of legacy maintained JavaScript entrypoints: do not
  re-add `eslint.config.js`, `playwright.config.js`, or
  `scripts/run-typescript-script.js`.
- Run `npm run check:no-source-javascript` or `npm run check:scripts-core` after adding script, test, config, or packaging helper files.

## Type checking and linting

The default `npm run typecheck` uses `tsconfig.json` with `strict: false` so the
whole project can keep moving while legacy surfaces are tightened incrementally.

`npm run typecheck:strict` is strict by critical surface, not strict global yet.
Its current surface is grouped in `tsconfig.strict.json` as:

1. `electron/main/**/*.ts`
2. `electron/shared/**/*.ts`
3. `electron/preload/**/*.ts`
4. `scripts/core/**/*.ts`
5. selected Node tests and support helpers already compatible with strict mode

The next strict-mode expansion targets are `scripts/c420ui/**/*.ts`, then the
remaining tests. Do not broaden the strict config and fix unrelated code in the
same large patch; add one surface at a time and keep `npm run typecheck:strict`
green.

`npm run lint` uses safe project-wide ESLint rules only. Import resolver settings
should not be added unless a compatible import plugin is installed and documented.
`@typescript-eslint/no-unused-vars` remains a warning until real unused-variable
cleanup is complete.

## Documentation layout

Use [Project tree reference](PROJECT_TREE.md) before moving code across Electron, scripts, C420UI, packaging,
or generated-output boundaries. Use [C420UI separation roadmap](ROADMAP_C420UI_SEPARATION.md) before
changing C420UI package, adapter, or extraction boundaries.

Keep release-facing docs linked from `README.md` and `docs/README.md`. Internal
AI/dev memory belongs under `docs/internal/`; submission notes and historical
packaging notes belong under `docs/notes/`. Do not delete useful technical notes
when they leave the public index.

## Adding workflow actions

All workflow actions must be registered in:

```text
scripts/actions.json
```

Do not add hardcoded action lists directly in C420UI or launcher code.

Recommended flow:

1. Create backend logic as TypeScript (`scripts/*.ts` or `scripts/core/*.ts`) unless the task requires shell host-operation glue.
2. Add entry in `scripts/actions.json`.
3. Run `npm run actions:validate`.
4. Test direct CLI: `scripts/run-core-entry.sh action-runner --id <action-id> --dry-run`.
5. Test direct CLI and C420UI: `./canva-linux.sh --doctor` and `./canva-linux.sh`.

## Sudo and Privileged Actions

If your action requires root privileges, set `requiresRoot: true` in `scripts/actions.json` and use `scripts/sudo-common.sh` helpers in your backend script.

## Core Validation

All project contracts are checked by:

```bash
npm run check:scripts-core
```

This command automatically compiles the TypeScript core scripts if necessary.

## Next packaging target

Next line: AUR/PKGBUILD experimental packaging.
AUR actions must be added through `scripts/actions.json`.
