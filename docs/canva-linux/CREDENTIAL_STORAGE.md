# Canva Linux Credential Storage

Canva Linux is the dependent project that owns this runtime browser policy;
c420ui is the engine and does not decide Electron credential storage.

Canva Linux owns credential-storage runtime policy. c420ui does not control
Electron sessions, safe storage, cookies, or Canva login persistence.

## Controls

- Persistent session selection for secure Linux Secret Service backends.
- Ephemeral session fallback when secure storage is unavailable.
- User warnings for ephemeral sessions.
- Runtime policy for the `persist:canva` partition.

## Must not control

- c420ui root-auth password handling.
- c420ui Action Engine policy.
- Packaging artifact naming.

## Runtime policy

Persistent login requires a secure Linux Secret Service backend and available
safe storage encryption. Flatpak uses Secret Service/Freedesktop through `gnome-libsecret` as the default credential path. KWallet6 and KWallet5 are available as KDE compatibility paths through narrow D-Bus permissions and safe manual override. Canva Linux does not claim runtime fallback unless a real probe is implemented. If Electron reports `basic_text`, Canva Linux uses an
ephemeral session and must never use the `persist:canva` partition. Canva Linux
never treats `basic_text` as persistent.

Credential material, cookies, tokens, passwords, session values, and sudo input
must never be logged.

## Implementing files

- `electron/main/credential-storage.ts`
- `electron/main/runtime.ts`
- `electron/main/lifecycle.ts`
- `test/credential-storage*.test.ts`

## Boundary checks

- `npm test`
- `npm run docs:check-ai`
- `npm run check:canva-linux`

## Forbidden regressions

- Do not claim persistent login works without Secret Service.
- Do not store `basic_text` sessions in `persist:canva`.
- Do not remove the ephemeral-session warning.
- Do not log credential material.
