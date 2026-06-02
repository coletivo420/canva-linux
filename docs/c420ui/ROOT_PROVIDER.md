# c420ui Root Provider

The c420ui Root Provider owns generic privileged-action orchestration. Canva
Linux contributes project-specific root policy, but c420ui owns the reusable
contract and Linux implementation base.

## Controls

- The `c420uiRootProvider` contract.
- The Linux root provider base in `build-resources/c420ui/src/linux-root-provider.ts`.
- Non-interactive `validateRootAccess` checks.
- Interactive `validateRootAccessWithInput` checks.
- Root-auth environment propagation through `C420UI_ROOT_AUTH`.
- Use of `build-resources/c420ui/operations/host/sudo.ts` sudo operation helpers for Linux sudo validation.

## Must not control

- Which concrete Canva Linux actions are system-scope or user-scope.
- Canva Linux environment names such as `CANVA_NATIVE_SCOPE` or
  `CANVA_FLATPAK_SCOPE` inside c420ui core.
- Electron startup behavior, OAuth behavior, or app-session behavior.

## Root flow

For a root-required action, c420ui validates administrator access before running
any concrete project command. CLI flows use `validateRootAccess`. Terminal flows
can use `requestRootAccess`, which calls `validateRootAccessWithInput` with the
submitted password and clears the submitted input afterward.

When validation succeeds, the root provider can add `C420UI_ROOT_AUTH=1` to the
execution environment. The TypeScript sudo operation helpers recognize that
value and avoid asking for authentication again for the already-approved action
path.

## Password and log safety

Passwords and sudo stdin must never be written to logs, diagnostic output, event
data, thrown errors, or command arguments shown to the user. The submitted input
must be passed through stdin to `sudo validation with password input` and then
cleared.

## Implementing files

- `build-resources/c420ui/src/root-provider.ts`
- `build-resources/c420ui/src/linux-root-provider.ts`
- `build-resources/c420ui/operations/host/sudo.ts`
- `build-resources/c420ui/src/action-engine.ts`
- `build-resources/c420ui/src/terminal/app.ts`
- `build-resources/canva-linux/c420ui-adapter/root-provider.ts`

## Consumed configs and adapters

Canva Linux root decisions are exposed by `build-resources/canva-linux/c420ui-adapter/root-provider.ts`.
The adapter may read Canva Linux action metadata, but generic c420ui code must
not import Canva Linux config directly.

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm test`
- `npm run check:c420ui-core`

## Forbidden regressions

- Do not call raw `sudo` outside `build-resources/c420ui/operations/host/sudo.ts`.
- Do not log passwords, sudo stdin, cookies, tokens, or credential material.
- Do not run sudo for user-scope actions.
- Do not duplicate the Linux root provider base in Canva Linux code.
- Do not move the terminal root launch guard out of c420ui terminal runtime.
