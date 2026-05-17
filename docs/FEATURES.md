# Canva Linux features

Canva Linux is not a plain Electron webview.

Protected features:

- Secret Service-backed persistent Canva session
- secure credential storage through Linux Secret Service backends
- persistent login only when a secure credential backend is selected and encryption is available
- ephemeral session fallback when no secure credential backend or encryption key is available
- Flatpak local install flow
- Flatpak bundle flow
- Flathub validation path
- WebContentsView tab shell
- toolbar bridge
- OAuth popup routing
- drag-and-drop upload ingress
- clipboard/paste upload ingress
- file picker continuation
- custom EyeDropper compatibility layer
- GPU acceleration and diagnostics
- central logging in `logs/current.log`
- runtime CLI diagnostics with `canva-linux --canva-debug=1` and `canva-linux --canva-debug=2`
- JSON/package preflight validation

Do not remove feature-specific code because it looks verbose.

## Credential storage and persistent login

Canva Linux supports persistent login only when Electron/Chromium selects a secure Linux credential storage backend
and reports that safe storage encryption is available. The selected backend name alone is not enough.

Supported secure examples include:

- KWallet on KDE Plasma (`kwallet`, `kwallet5`, `kwallet6`)
- GNOME Keyring / libsecret on GNOME and compatible desktops (`gnome_libsecret`)
- compatible Secret Service providers used by desktops such as XFCE, Cinnamon, Pantheon and others when exposed through libsecret

Canva Linux automatically resolves the native credential store for the detected Linux desktop before Electron starts.
KDE/Plasma tries KWallet first, then the alternate KWallet generation, then Secret Service/libsecret.
GNOME and Secret Service-compatible desktops try Secret Service/libsecret first, then KWallet compatibility paths.
Flatpak grants narrow D-Bus access to those credential services without opening the full session bus.

Canva Linux never treats `basic_text` as persistent. If Electron reports `basic_text`, an unknown backend, a detection error, or a nominally secure backend
with unavailable encryption (for example a locked or cancelled keyring prompt), Canva Linux starts in ephemeral session mode.
In this mode, credentials, cookies and login state are not saved after closing the app.

## Changelog-backed features

Features documented in `CHANGELOG.md` are considered established behavior.

Do not remove or weaken them during cleanup, TypeScript migration, refactors, documentation passes, or AI-assisted simplification unless explicitly requested by the maintainer.

If a feature appears obsolete but is documented in `CHANGELOG.md`, open a review note instead of deleting it silently.
