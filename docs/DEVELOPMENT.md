# Development

## Requirements

- Node.js >= 22
- npm
- Git
- Flatpak
- flatpak-builder
- desktop-file-utils
- appstreamcli

Flatpak-related tools are required for Flatpak install and `.flatpak` package generation. Native install and AppImage packaging still require Node.js, npm, Git and Electron build toolchain dependencies.

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
- Run `npm run check:no-source-javascript` or `npm run check:scripts-core` after adding script, test, config, or packaging helper files.

## Adding workflow actions

All workflow actions must be registered in:

```text
scripts/actions.json
```

Do not add hardcoded action lists directly in TUI or launcher code.

Recommended flow:

1. Create backend logic as TypeScript (`scripts/*.ts` or `scripts/core/*.ts`) unless the task requires shell host-operation glue.
2. Add entry in `scripts/actions.json`.
3. Run `npm run actions:validate`.
4. Test direct CLI: `scripts/run-core-entry.sh action-runner --id <action-id> --dry-run`.
5. Test direct CLI and TUI: `./canva-linux.sh --doctor` and `./canva-linux.sh`.

## Sudo and Privileged Actions

If your action requires root privileges, set `requiresRoot: true` in `scripts/actions.json` and use `scripts/sudo-common.sh` helpers in your backend script.

## Core Validation

All project contracts are checked by:

```bash
npm run check:scripts-core
```

This command automatically compiles the TypeScript core scripts if necessary.

## Next packaging target

Next line: `0.1.4.12-dev.1 — AUR/PKGBUILD experimental`.
AUR actions must be added through `scripts/actions.json`.
