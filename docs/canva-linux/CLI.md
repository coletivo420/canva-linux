# Canva Linux CLI

Canva Linux is the dependent project. c420ui is the engine that resolves and runs
terminal and direct CLI actions.

## Controls

- `canva-linux-c420ui-builder` launcher argument handling.
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
./canva-linux-c420ui-builder
./canva-linux-c420ui-builder --doctor
./canva-linux-c420ui-builder --doctor --dry-run
npm run c420ui:cli -- --help
```

The launcher opens c420ui without arguments. With a direct action flag, the launcher invokes `bootstrap/c420ui/run-c420ui-cli.cjs` when the generated bundle is present, with `.build/scripts/run-c420ui-cli.js` kept only as a development fallback. Direct actions resolve through c420ui and the Canva Linux action registry.

## Implementing files

- `canva-linux-c420ui-builder`
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

## Bootstrap startup policy

The launcher prefers the generated c420ui bootstrap bundle before any development build output:

- `./canva-linux-c420ui-builder` starts `bootstrap/c420ui/run-c420ui.cjs` when present.
- Direct actions such as `./canva-linux-c420ui-builder --doctor --dry-run` start `bootstrap/c420ui/run-c420ui-cli.cjs` when present.
- `.build/scripts/run-c420ui*.js` remains a development fallback only.

The launcher must not run `npm install`, `npm ci`, or `npm run build:scripts` before trying the bootstrap bundle. The bundle only starts c420ui; full dependency checks and repair remain c420ui Host Dependency Runner responsibilities.

## Interactive dependency ordering

Interactive startup opens c420ui before Canva Linux dependency repair. Dependency checks and repair are shown through the
c420ui logs after the UI mounts. Direct CLI actions may still validate required dependencies according to c420ui policy
because they do not have an interactive UI surface.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.
