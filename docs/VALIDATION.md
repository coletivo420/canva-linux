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
