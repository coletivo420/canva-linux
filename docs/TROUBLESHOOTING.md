# Troubleshooting

## `node: command not found`

This error means Node.js is missing from the host system or is not available in `PATH`.

Check:

```bash
command -v node
node -v
```

Canva Linux development workflows require Node.js >= 22.

Install the required packages for your distribution using the README.md requirements section.

## Login is not saved after restart

If Canva Linux says it is using ephemeral session mode, Electron either did not expose a secure Secret Service backend
or could not verify that safe storage encryption is available.

Install or enable:

- KWallet on KDE Plasma
- GNOME Keyring / libsecret on GNOME
- a compatible Secret Service provider on your desktop environment

Also make sure the keyring or wallet is unlocked and that any access prompt is accepted.
A backend name such as `kwallet6` or `gnome_libsecret` is not sufficient by itself;
persistent login also requires `safeStorage.isEncryptionAvailable()` to return `true`.

After enabling it, restart Canva Linux and check startup logs for the credential storage backend and encryption availability.
Secure backend names include `kwallet`, `kwallet5`, `kwallet6`, and `gnome_libsecret`.
If the logs still show `basic_text`, an unknown backend, or unavailable encryption, Canva Linux will keep using ephemeral session mode
and login, cookies and credentials will not be saved.

## Google One Tap / FedCM warning

Canva may emit a `[GSI_LOGGER]` warning from `static.canva.com` about Google One Tap prompt UI status methods and FedCM migration.

This warning is emitted by Canva/Google Identity Services page code, not by Canva Linux. Canva Linux must not monkeypatch Google Identity Services APIs to silence it.

Treat it as an upstream compatibility warning unless Google login stops working.
