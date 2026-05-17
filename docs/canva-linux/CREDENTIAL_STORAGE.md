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

## Runtime CLI overrides

Credential-store overrides are runtime CLI flags on the compiled app:

```bash
canva-linux --credential-store=auto
canva-linux --credential-store=gnome-libsecret
canva-linux --credential-store=kwallet6
canva-linux --credential-store=kwallet5
```

`--credential-store=auto` keeps desktop/D-Bus automatic fallback. Unsafe stores such as `basic_text` are rejected and never become persistent session policy.

## Runtime policy

Persistent login requires a secure Linux credential backend and available
safe storage encryption. Canva Linux automatically resolves the native credential store for the detected Linux desktop before Electron starts.
KDE/Plasma tries KWallet first, then the alternate KWallet generation, then Secret Service/libsecret.
GNOME and Secret Service-compatible desktops try Secret Service/libsecret first, then KWallet compatibility paths.
Flatpak grants narrow D-Bus access to those credential services without opening the full session bus.
If Electron reports `basic_text`, Canva Linux uses an ephemeral session and must never use the `persist:canva` partition.
Canva Linux never treats `basic_text` as persistent.

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
