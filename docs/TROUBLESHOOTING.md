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

## Google One Tap / FedCM warning

Canva may emit a `[GSI_LOGGER]` warning from `static.canva.com` about Google One Tap prompt UI status methods and FedCM migration.

This warning is emitted by Canva/Google Identity Services page code, not by Canva Linux. Canva Linux must not monkeypatch Google Identity Services APIs to silence it.

Treat it as an upstream compatibility warning unless Google login stops working.
