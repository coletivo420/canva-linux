# Canva Linux features

Canva Linux is not a plain Electron webview.

Protected features:

- persistent Canva session
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
- `CANVA_DEBUG=1` and `CANVA_DEBUG=2`
- JSON/package preflight validation

Do not remove feature-specific code because it looks verbose.

## Changelog-backed features

Features documented in `CHANGELOG.md` are considered established behavior.

Do not remove or weaken them during cleanup, TypeScript migration, refactors, documentation passes, or AI-assisted simplification unless explicitly requested by the maintainer.

If a feature appears obsolete but is documented in `CHANGELOG.md`, open a review note instead of deleting it silently.
