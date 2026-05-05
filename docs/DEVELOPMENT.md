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

## Adding workflow actions

All workflow actions must be registered in:

```text
scripts/actions.json
```

Do not add hardcoded action lists directly in TUI or shell menu.

Recommended flow:

1. Create backend script under `scripts/`.
2. Add entry in `scripts/actions.json`.
3. Run `npm run actions:validate`.
4. Test direct CLI: `node scripts/action-runner.js --id <action-id> --dry-run`.
5. Test shell/TUI: `./canva-linux.sh --no-tui` and `./canva-linux.sh --tui`.

## Next packaging target

Next line: `0.1.4.12-dev.1 — AUR/PKGBUILD experimental`.
AUR actions must be added through `scripts/actions.json`.
