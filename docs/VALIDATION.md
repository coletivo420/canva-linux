# Validation

## Terminal Assistant validation

```bash
./canva-linux.sh
./canva-linux.sh --tui
./canva-linux.sh --no-tui
CANVA_NO_TUI=1 ./canva-linux.sh
CANVA_TUI=1 ./canva-linux.sh
TERM=dumb ./canva-linux.sh
./canva-linux.sh | cat
```

Expected: interactive terminal opens TUI by default; `--no-tui`/`CANVA_NO_TUI=1` use shell fallback; `TERM=dumb` and piped mode do not open TUI.

## Shared Action Registry validation

```bash
npm run actions:validate
node scripts/action-runner.js --help
node scripts/action-runner.js --list-ids
node scripts/action-runner.js --group install
node scripts/action-runner.js --group development
node scripts/action-runner.js --group maintenance
node scripts/action-runner.js --id doctor --dry-run
node scripts/action-runner.js --cli --doctor --dry-run
node scripts/action-runner.js --cli --prepare-aur
```

Expected: registry validates; real actions resolve to backend commands; planned actions print planned status; dangerous actions require confirmation.


## TUI theme validation

```bash
npm run build:tui
./canva-linux.sh --tui
```

Manual checks:
- Header shows Canva Linux — Install and Development Tool;
- Header shows Phase: 0.1.4.11-dev.44;
- Overview shows logo;
- Overview shows Version below the logo;
- Overview shows Phase below Version;
- Overview shows Version Release Notes;
- selected menu item is visibly highlighted;
- stderr remains red in the log panel;
- dangerous modals are visually distinct;
- shell fallback still respects NO_COLOR=1.


## dev45 UX validation

Run `./canva-linux.sh --tui` and validate: F4 switches to Shell Tool, Shell `Use TUI Tool` returns to TUI, Overview shows package/version + detection, maintenance hides manual detect/uninstall-detected, logs are larger, native scrollbar appears, F5 copies logs or warns.

Clipboard tool check:
`command -v wl-copy || command -v qdbus6 || command -v qdbus || command -v gpaste-client || command -v gpaste || command -v xclip || command -v xsel`.
