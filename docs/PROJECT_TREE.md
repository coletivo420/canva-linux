# Project tree reference

This page is a reference map for humans and AI agents working on Canva Linux.
It describes the current repository layout and the intended C420UI split points
without promising an external package or publication timeline.

## Current and planned top-level layout

```text
.
├── electron/                  Electron runtime source
│   ├── main/                  Electron main process runtime
│   ├── preload/               Canva, toolbar, diagnostics, and CL-EyeDropper preload sources
│   ├── shared/                Runtime helpers shared by main/preload code
│   ├── ui/                    Static Electron shell UI assets
│   └── assets/                Runtime assets copied into the Electron build
├── scripts/                   Canva Linux tool, validation, packaging, and host-operation source
│   ├── core/                  TypeScript validation, action contracts, and action-runner core
│   ├── c420ui/                Current in-repo C420UI implementation before package split
│   ├── c420ui-canva-linux/    Planned Canva Linux adapter location for C420UI integration
│   └── *.sh                   Linux host-operation glue and launcher/install/package wrappers
├── packages/                  Planned package workspace; no published C420UI package exists yet
│   └── c420ui/                Planned standalone C420UI package after the split
├── docs/                      Public and internal project documentation
│   ├── *.md                   Public user, contributor, release, validation, and architecture docs
│   ├── internal/              AI, developer-memory, historical, and legacy notes
│   └── notes/                 Packaging and submission notes
├── packaging/                 Packaging submission workspaces
│   └── flathub/               Flathub manifest, source generation, and submission helpers
├── test/                      TypeScript-first node:test and smoke-test sources
├── data/                      Desktop/AppStream metadata and install-time integration data
├── build-resources/           Packaging icons and electron-builder resources
├── assets/                    Repository documentation assets such as screenshots
├── .build/                    Generated JavaScript runtime, scripts, preload bundle, and tests
├── dist/                      Generated package artifacts and unpacked application output
├── coverage/                  Generated coverage output when tests create it
├── repo/                      Generated Flatpak repository output
├── node_modules/              Package-manager installed dependencies
├── README.md                  Project entry point
├── CHANGELOG.md               Release-facing project history
└── canva-linux.sh             Main launcher for C420UI/default and direct CLI workflows
```

Some planned directories may not exist until their corresponding split work
starts. In particular, `scripts/c420ui-canva-linux/`, `packages/`, and
`packages/c420ui/` are reference boundaries for the C420UI separation plan, not
published or supported external package locations today.

## Maintained source

Treat these as maintained source when editing behavior:

- `electron/**/*.ts` for the Electron main, preload, shared, and runtime UI code.
- `scripts/**/*.ts` for validation, action contracts, Action Runner logic,
  C420UI code, and TypeScript packaging helpers.
- `packaging/flathub/scripts/**/*.ts` for Flathub source-generation logic.
- `packages/**/*.ts` only after package workspace files exist.
- `test/**/*.ts` for unit, wiring, runtime, and smoke-test source.
- Shell scripts used for host operations, launcher glue, sudo, install, purge,
  Flatpak/AppImage packaging, XDG integration, and pre-Node validation.
- Root TypeScript config files such as `eslint.config.ts` and
  `playwright.config.ts`.

Do not add maintained JavaScript entry points for these surfaces. JavaScript is
allowed only where project policy identifies it as generated or dependency output.

## Generated and dependency output

Treat these paths as generated, disposable, or package-managed output:

- `.build/` for compiled Electron runtime, compiled support scripts, tests, and
  generated preload bundles.
- `dist/` for generated package artifacts and unpacked application output.
- `coverage/` for generated coverage reports.
- `repo/` for generated Flatpak repository output.
- `node_modules/` for npm-installed dependencies.

Do not move generated JavaScript from `.build/` into maintained source trees.
Do not edit generated output as the source of truth.

## C420UI split boundaries

The current repository still hosts the Canva Linux C420UI implementation under
`scripts/c420ui/`. That directory is transitional: it is the active in-repo UI
implementation until a package split is explicitly performed.

The intended separation is:

- **C420UI core**: reusable terminal UI primitives, layout, focus, logs, modal,
  and brand/project-header boundaries. Today these live in `scripts/c420ui/`.
- **Canva Linux adapter**: project-specific actions, metadata, launch wiring,
  install/package status, and Canva Linux labels. The planned boundary is
  `scripts/c420ui-canva-linux/` before or during extraction.
- **Future package workspace**: `packages/c420ui/` is reserved for a possible
  standalone C420UI package after the core is separated. It is not a published
  npm package and should not be documented as externally consumable yet.
- **Action contract**: C420UI and direct CLI actions must continue to source
  actions from `scripts/actions.json` and shared TypeScript action contracts.

When moving code toward the split, avoid hardcoding Canva Linux project metadata
inside reusable C420UI core code. Keep C420UI branding and project branding as
separate concepts.

## Runtime and packaging boundaries

- `electron/` is application runtime code. It should not absorb C420UI terminal
  UI implementation details.
- `scripts/core/` contains validation and action infrastructure used by direct
  CLI and C420UI workflows. It is not Electron runtime code.
- Shell scripts in `scripts/` are Linux host-operation glue. Keep sudo, install,
  purge, Flatpak, AppImage, and desktop integration behavior there when Node is
  the wrong boundary.
- `packaging/flathub/` is a Flathub submission workspace. It is distinct from
  general runtime source and from generated `repo/` output.
- Public docs live in `docs/*.md`; AI/developer memory, guardrails, and legacy
  notes live under `docs/internal/`.
