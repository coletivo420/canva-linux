# Canva Linux CLI

Canva Linux is the dependent project. c420ui is the engine that resolves and runs
terminal and direct CLI actions.

## Controls

- `canva-linux.sh` launcher argument handling.
- Default terminal startup when no direct action is supplied.
- Forwarding one direct action flag to the c420ui CLI bridge.
- Stable user-facing launcher help.

## Must not control

- Planned-action, dry-run, confirmation, or root policy. Those belong to the
  c420ui Action Engine and Root Provider.
- Concrete command execution outside c420ui policy.
- npm dependency installation policy.

## Usage

```bash
./canva-linux.sh
./canva-linux.sh --doctor
./canva-linux.sh --doctor --dry-run
npm run c420ui:cli -- --help
```

The launcher opens c420ui without arguments. With a direct action flag, the
launcher invokes `.build/scripts/run-c420ui-cli.js`, which resolves actions
through c420ui and the Canva Linux action registry.

## Implementing files

- `canva-linux.sh`
- `scripts/run-c420ui-cli.ts`
- `scripts/c420ui-adapter/cli.ts`
- `packages/c420ui/src/cli.ts`
- `config/canva-linux/actions.json`

## Boundary checks

- `npm run check:canva-linux`
- `npm run check:c420ui-core`
- `npm test`

## Forbidden regressions

- Do not restore shell menus or interface-routing environment variables.
- Do not allow multiple direct actions in one invocation.
- Do not run the tool as root.
- Do not route direct CLI around the c420ui Action Engine.
