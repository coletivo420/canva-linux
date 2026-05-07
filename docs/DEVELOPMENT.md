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

## Repository language and future i18n

- All maintained source code, comments, UI strings, README, docs, changelog, and AI maintenance instructions must be written in English.
- Do not add Portuguese comments, Portuguese docs, Portuguese UI strings, or mixed-language source text.
- User-facing translations may be introduced later only through an explicit i18n architecture with structured translation
  resources, typed keys, and fallback language rules.
- Until that i18n system exists, English is the only maintained repository language.

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

Use [Project tree reference](PROJECT_TREE.md) before moving code across Electron, scripts, c420ui, packaging,
or generated-output boundaries. Use [c420ui separation roadmap](ROADMAP_C420UI_SEPARATION.md) before
changing c420ui package, adapter, or extraction boundaries.

Keep release-facing docs linked from `README.md` and `docs/README.md`. Internal
AI/dev memory belongs under `docs/internal/`; submission notes and historical
packaging notes belong under `docs/notes/`. Do not delete useful technical notes
when they leave the public index.

## Adding workflow actions

All workflow actions must be registered in:

```text
scripts/actions.json
```

Do not add hardcoded action lists directly in c420ui or launcher code.

New direct action execution logic must be modeled in the c420ui action engine first. Project adapters provide concrete
action execution; they must not duplicate generic planned-action, dry-run or exit-code behavior.

Recommended flow:

1. Create backend logic as TypeScript (`scripts/*.ts` or `scripts/core/*.ts`) unless the task requires shell host-operation glue.
2. Add entry in `scripts/actions.json`.
3. Run `npm run actions:validate`.
4. Test direct CLI: `scripts/run-core-entry.sh action-runner --id <action-id> --dry-run`.
5. Test direct CLI and c420ui: `./canva-linux.sh --doctor` and `./canva-linux.sh`.

## Sudo and Privileged Actions

If your action requires root privileges, set `requiresRoot: true` in `scripts/actions.json` and use `scripts/sudo-common.sh` helpers in your backend script.

## Core Validation

Core script contracts are checked by:

```bash
npm run check:scripts-core
```

The generic c420ui package contracts and the Canva Linux adapter contracts are
checked separately:

```bash
npm run check:c420ui-core
npm run check:canva-linux
```

These commands automatically compile their TypeScript check scripts if necessary.

## Next packaging target

Next line: AUR/PKGBUILD experimental packaging.
AUR actions must be added through `scripts/actions.json`.

## Direct CLI bridge development

Direct launcher actions are built with `npm run build:scripts` and executed through
`.build/scripts/run-c420ui-cli.js`. The concrete Canva Linux wiring lives in
`scripts/c420ui-canva-linux/cli.ts`; reusable parsing and action execution live in
`packages/c420ui/src/cli.ts`.

Keep direct action resolution inside the c420ui Action Engine and preserve the
legacy Action Runner until compatibility checks have moved.
